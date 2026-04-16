import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import BottomNav from "../components/BottomNav";
import { PageHeader } from "../components/PageHeaderProps";
import { triggerNotificationsRefresh } from "../utils/notificationsRefresh";
import { readStoredJwt } from "../utils/jwtToken";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import "../style/LoansPage.css";

type JwtClaims = {
  sub?: string;
  username?: string;
  preferred_username?: string;
};

type Role = "LENDER" | "BORROWER";

type LoanCard = {
  id: number;
  title: string;
  principalAmount: number;
  sumPaid: number;
  sumLeft: number;
  borrowerUsername: string;
  lenderUsername: string;
};

type UserCandidate = {
  username: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function toAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toAmountOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatNok(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeLoan(raw: unknown): LoanCard | null {
  if (!isRecord(raw)) return null;

  const id = toId(raw.id ?? raw.loanId ?? raw.loan_id);
  if (id == null) return null;

  const title = toCleanString(raw.title ?? raw.loanTitle ?? raw.loan_title) || "Lån";
  const principalAmount = toAmount(
    raw.principalAmount ?? raw.principal_amount ?? raw.amount ?? raw.principal
  );
  const paidCandidate = toAmountOrNull(
    raw.sumPaid ??
      raw.sum_paid ??
      raw.paidAmount ??
      raw.paid_amount ??
      raw.amountPaid ??
      raw.amount_paid ??
      raw.totalPaid ??
      raw.total_paid ??
      raw.paid
  );
  const leftCandidate = toAmountOrNull(
    raw.sumLeft ??
      raw.sum_left ??
      raw.remainingAmount ??
      raw.remaining_amount ??
      raw.amountLeft ??
      raw.amount_left ??
      raw.leftToPay ??
      raw.left_to_pay ??
      raw.remaining
  );
  const sumPaid = Math.max(0, paidCandidate ?? 0);
  const derivedLeft = Math.max(0, principalAmount - sumPaid);
  const parsedLeft = Math.max(0, leftCandidate ?? derivedLeft);
  const sumLeft = parsedLeft === 0 && derivedLeft > 0 ? derivedLeft : parsedLeft;
  const borrowerUsername = toCleanString(raw.borrowerUsername ?? raw.borrower_username);
  const lenderUsername = toCleanString(raw.lenderUsername ?? raw.lender_username);

  return {
    id,
    title,
    principalAmount,
    sumPaid,
    sumLeft,
    borrowerUsername,
    lenderUsername,
  };
}

function mergeLoanWithDetail(baseLoan: LoanCard, detailRaw: unknown): LoanCard {
  const detailLoan = normalizeLoan(detailRaw);
  if (!detailLoan) return baseLoan;

  return {
    ...baseLoan,
    title: detailLoan.title || baseLoan.title,
    principalAmount:
      detailLoan.principalAmount > 0 ? detailLoan.principalAmount : baseLoan.principalAmount,
    sumPaid: detailLoan.sumPaid,
    sumLeft: detailLoan.sumLeft,
    borrowerUsername: detailLoan.borrowerUsername || baseLoan.borrowerUsername,
    lenderUsername: detailLoan.lenderUsername || baseLoan.lenderUsername,
  };
}

function normalizeUsers(raw: unknown): UserCandidate[] {
  if (!Array.isArray(raw)) return [];

  const users: UserCandidate[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const username = toCleanString(entry.username);
    if (!username) continue;
    const key = username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    users.push({ username });
  }

  return users;
}

function otherPartyFor(loan: LoanCard, currentUsername: string): string {
  const current = currentUsername.trim().toLowerCase();
  const borrower = loan.borrowerUsername.trim().toLowerCase();
  const lender = loan.lenderUsername.trim().toLowerCase();

  if (current && current === borrower) {
    return loan.lenderUsername || "Ukjent";
  }
  if (current && current === lender) {
    return loan.borrowerUsername || "Ukjent";
  }

  return loan.borrowerUsername || loan.lenderUsername || "Ukjent";
}

const LoansPage: React.FC = () => {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = useMemo(() => readStoredJwt(), []);

  const currentUsername = useMemo(() => {
    if (!token) return "";
    try {
      const decoded = jwtDecode<JwtClaims>(token);
      const identity = decoded.sub || decoded.username || decoded.preferred_username || "";
      return identity.toLowerCase();
    } catch {
      return "";
    }
  }, [token]);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [loans, setLoans] = useState<LoanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [otherUserQuery, setOtherUserQuery] = useState("");
  const [otherUser, setOtherUser] = useState<UserCandidate | null>(null);
  const [searchResults, setSearchResults] = useState<UserCandidate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role>("LENDER");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const latestFetchRequestRef = useRef(0);

  const fetchLoans = useCallback(async () => {
    const requestId = latestFetchRequestRef.current + 1;
    latestFetchRequestRef.current = requestId;

    if (!token) {
      setLoans([]);
      setError("Ikke innlogget.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/loans`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Kunne ikke hente lån (${res.status})`);
      }

      const payload = (await res.json()) as unknown;
      const nextLoans = Array.isArray(payload)
        ? payload
            .map(normalizeLoan)
            .filter((entry): entry is LoanCard => entry !== null)
            .sort((a, b) => b.id - a.id)
        : [];

      setLoans(nextLoans);

      if (nextLoans.length > 0) {
        void (async () => {
          const enrichedLoans = await Promise.all(
            nextLoans.map(async (loan) => {
              try {
                const detailRes = await fetch(`${apiBaseUrl}/api/loans/${loan.id}`, {
                  headers: authHeaders,
                });

                if (!detailRes.ok) return loan;

                const detailPayload = (await detailRes.json()) as unknown;
                return mergeLoanWithDetail(loan, detailPayload);
              } catch {
                return loan;
              }
            })
          );

          if (latestFetchRequestRef.current !== requestId) return;

          const hasChanges = enrichedLoans.some((loan, index) => {
            const previous = nextLoans[index];
            return (
              loan.principalAmount !== previous.principalAmount ||
              loan.sumPaid !== previous.sumPaid ||
              loan.sumLeft !== previous.sumLeft
            );
          });

          if (hasChanges) {
            setLoans(enrichedLoans);
          }
        })();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente lån.");
      setLoans([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, token]);

  useEffect(() => {
    void fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    if (!createOpen) return;

    const query = otherUserQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const lowered = query.toLowerCase();
        let users: UserCandidate[] = [];

        const searchRes = await fetch(
          `${apiBaseUrl}/api/users/search?q=${encodeURIComponent(query)}`,
          { headers: authHeaders, signal: controller.signal }
        );

        if (searchRes.ok) {
          users = normalizeUsers((await searchRes.json()) as unknown);
        } else if (searchRes.status === 404 || searchRes.status === 405) {
          const allUsersRes = await fetch(`${apiBaseUrl}/api/users`, {
            headers: authHeaders,
            signal: controller.signal,
          });
          if (!allUsersRes.ok) {
            const text = await allUsersRes.text().catch(() => "");
            throw new Error(text || `Kunne ikke hente brukere (${allUsersRes.status})`);
          }
          users = normalizeUsers((await allUsersRes.json()) as unknown);
        } else {
          const text = await searchRes.text().catch(() => "");
          throw new Error(text || `Kunne ikke søke brukere (${searchRes.status})`);
        }

        const filtered = users
          .filter((candidate) => candidate.username.toLowerCase().includes(lowered))
          .filter((candidate) => candidate.username.toLowerCase() !== currentUsername)
          .slice(0, 10);

        setSearchResults(filtered);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : "Kunne ikke søke brukere.");
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [apiBaseUrl, authHeaders, createOpen, currentUsername, otherUserQuery]);

  const openCreateModal = () => {
    setCreateOpen(true);
    setOtherUserQuery("");
    setOtherUser(null);
    setSearchResults([]);
    setSearchError(null);
    setMyRole("LENDER");
    setAmount("");
    setTitle("");
    setCreateError(null);
  };

  const closeCreateModal = () => {
    if (createLoading) return;
    setCreateOpen(false);
  };

  const handleCreateLoan = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const query = otherUserQuery.trim();
    const fallbackUser =
      searchResults.find((candidate) => candidate.username.toLowerCase() === query.toLowerCase()) ||
      null;
    const selectedUser = otherUser || fallbackUser;
    if (!selectedUser) {
      setCreateError("Velg en bruker som motpart.");
      return;
    }

    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCreateError("Beløp må være større enn 0.");
      return;
    }

    setCreateLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/loans`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otherUsername: selectedUser.username,
          myRole,
          amount: parsedAmount,
          title: title.trim() || "Privat lån",
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Kunne ikke opprette lån (${res.status})`);
      }

      let createdLoanId: number | null = null;
      const responseText = await res.text().catch(() => "");
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText) as unknown;
          if (isRecord(parsed)) {
            createdLoanId = toId(parsed.id ?? parsed.loanId);
          }
        } catch {
          createdLoanId = null;
        }
      }

      triggerNotificationsRefresh("loan:create");
      setCreateOpen(false);
      await fetchLoans();

      if (createdLoanId != null) {
        navigate(`/loans/${createdLoanId}`);
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Kunne ikke opprette lån.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="profilePage loansPage">
      <div className="bgGlow" />
      <main className="profileMain loansMain">
        <PageHeader title="Lån" subtitle="Oversikt over aktive lån" showBack />

        <section className="section card loansCard">
          <div className="loansToolbar">
            <div className="sectionTitle loansSectionTitle">Dine lån</div>
            <button type="button" className="loanPrimaryBtn loansCreateBtn" onClick={openCreateModal}>
              Opprett lån
            </button>
          </div>

          {loading ? (
            <p className="loansState">Laster lån...</p>
          ) : error ? (
            <p className="loansState loansError">{error}</p>
          ) : loans.length === 0 ? (
            <p className="loansState">Ingen aktive lån funnet.</p>
          ) : (
            <div className="loansList">
              {loans.map((loan) => {
                const otherParty = otherPartyFor(loan, currentUsername);
                return (
                  <article
                    key={loan.id}
                    className="loansItem loansItem--interactive"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/loans/${loan.id}`);
                      }
                    }}
                  >
                    <div className="loansItemTop">
                      <div>
                        <div className="loansTitle">{loan.title || "Lån"}</div>
                        <div className="loansParty">Motpart: {otherParty}</div>
                      </div>
                      <div className="loansOpenHint">Åpne</div>
                    </div>

                    <div className="loansBalanceRow">
                      <div className="loansBalance loansBalance--paid">
                        <span className="loansBalanceLabel">Betalt</span>
                        <span className="loansBalanceValue">{formatNok(loan.sumPaid)}</span>
                      </div>
                      <div className="loansBalance loansBalance--left">
                        <span className="loansBalanceLabel">Gjenstår</span>
                        <span className="loansBalanceValue">{formatNok(loan.sumLeft)}</span>
                      </div>
                    </div>

                    <div className="loansTotalLine">
                      <span className="loansTotalLabel">Totalt</span>
                      <span className="loansTotalValue">{formatNok(loan.principalAmount)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <BottomNav />

      {createOpen ? (
        <div className="loanModalBackdrop" onClick={closeCreateModal}>
          <div className="loanModal" onClick={(event) => event.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">Opprett lån</div>
              <button className="loanModalClose" type="button" onClick={closeCreateModal}>
                x
              </button>
            </div>

            <form className="loanForm" onSubmit={handleCreateLoan}>
              <label className="formField">
                <span>Motpart (brukernavn)</span>
                <input
                  type="text"
                  value={otherUserQuery}
                  onChange={(event) => {
                    setOtherUserQuery(event.target.value);
                    setOtherUser(null);
                    setCreateError(null);
                  }}
                  placeholder="Søk etter bruker"
                  autoComplete="off"
                  required
                />
              </label>

              {searchLoading ? <p className="loansSearchState">Søker...</p> : null}
              {searchError ? <p className="loansSearchState loansError">{searchError}</p> : null}
              {!searchLoading && searchResults.length > 0 ? (
                <div className="loansSearchList">
                  {searchResults.map((candidate) => {
                    const isSelected =
                      otherUser?.username.toLowerCase() === candidate.username.toLowerCase();
                    return (
                      <button
                        key={candidate.username}
                        type="button"
                        className={`loansSearchItem${isSelected ? " active" : ""}`}
                        onClick={() => {
                          setOtherUser(candidate);
                          setOtherUserQuery(candidate.username);
                          setCreateError(null);
                        }}
                      >
                        {candidate.username}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="loanRoleRow">
                <button
                  type="button"
                  className={`loanRoleChip${myRole === "LENDER" ? " active" : ""}`}
                  onClick={() => setMyRole("LENDER")}
                >
                  Jeg er utlåner
                </button>
                <button
                  type="button"
                  className={`loanRoleChip${myRole === "BORROWER" ? " active" : ""}`}
                  onClick={() => setMyRole("BORROWER")}
                >
                  Jeg er låntaker
                </button>
              </div>

              <div className="formGrid">
                <label className="formField">
                  <span>Beløp</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="5000"
                    required
                  />
                </label>
                <label className="formField">
                  <span>Tittel (valgfritt)</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Privat lån"
                  />
                </label>
              </div>

              <div className="formActions">
                <button type="submit" className="loanPrimaryBtn" disabled={createLoading}>
                  {createLoading ? "Oppretter..." : "Opprett lån"}
                </button>
                <button
                  type="button"
                  className="loanGhostBtn"
                  onClick={closeCreateModal}
                  disabled={createLoading}
                >
                  Avbryt
                </button>
              </div>

              {createError ? <div className="formNotice error">{createError}</div> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LoansPage;
