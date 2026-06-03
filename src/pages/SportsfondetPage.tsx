import React, { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import { PageHeader } from "../components/PageHeaderProps";
import { readStoredJwt } from "../utils/jwtToken";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import "../style/SportsfondetPage.css";

type ApplicationStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "DECLINED";
type ApplicationType = "SPORTSFONDET" | "ANNET";
type ResponseAction = "ACCEPT" | "DECLINE" | "COUNTER";

type ApplicationOffer = {
  id: number;
  amount: number;
  description: string;
  offeredByUsername: string;
  counterOffer: boolean;
  createdAt: string;
};

type ApplicationListItem = {
  id: number;
  type: ApplicationType | string;
  status: ApplicationStatus | string;
  senderUsername: string;
  respondedByUsername: string | null;
  currentAmount: number;
  currentDescription: string;
  updatedAt: string;
};

type ApplicationDetail = {
  id: number;
  type: ApplicationType | string;
  status: ApplicationStatus | string;
  senderUsername: string;
  respondedByUsername: string | null;
  createdAt: string;
  updatedAt: string;
  currentOffer: ApplicationOffer | null;
  offers: ApplicationOffer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
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

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown): string | null {
  const text = toCleanString(value);
  return text || null;
}

function formatNok(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function extractResponseMessage(response: Response, fallback: string): Promise<string> {
  const text = (await response.text().catch(() => "")).trim();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      const message = toCleanString(parsed.message);
      const error = toCleanString(parsed.error);
      if (message) return message;
      if (error) return error;
    }
  } catch {
    // Plain text response.
  }

  return text || fallback;
}

function normalizeOffer(raw: unknown): ApplicationOffer | null {
  if (!isRecord(raw)) return null;
  const id = toId(raw.id);
  if (id == null) return null;

  return {
    id,
    amount: toAmount(raw.amount),
    description: toCleanString(raw.description),
    offeredByUsername: toCleanString(raw.offeredByUsername ?? raw.offered_by_username),
    counterOffer: Boolean(raw.counterOffer ?? raw.counter_offer),
    createdAt: toCleanString(raw.createdAt ?? raw.created_at),
  };
}

function normalizeListItem(raw: unknown): ApplicationListItem | null {
  if (!isRecord(raw)) return null;
  const id = toId(raw.id);
  if (id == null) return null;

  return {
    id,
    type: toCleanString(raw.type) || "SPORTSFONDET",
    status: toCleanString(raw.status) || "PENDING",
    senderUsername: toCleanString(raw.senderUsername ?? raw.sender_username),
    respondedByUsername: toNullableString(raw.respondedByUsername ?? raw.responded_by_username),
    currentAmount: toAmount(raw.currentAmount ?? raw.current_amount),
    currentDescription: toCleanString(raw.currentDescription ?? raw.current_description),
    updatedAt: toCleanString(raw.updatedAt ?? raw.updated_at),
  };
}

function normalizeDetail(raw: unknown): ApplicationDetail | null {
  if (!isRecord(raw)) return null;
  const id = toId(raw.id);
  if (id == null) return null;

  const offers = Array.isArray(raw.offers)
    ? raw.offers.map(normalizeOffer).filter((offer): offer is ApplicationOffer => offer !== null)
    : [];
  const currentOffer =
    normalizeOffer(raw.currentOffer ?? raw.current_offer) ??
    (offers.length > 0 ? offers[offers.length - 1] : null);

  return {
    id,
    type: toCleanString(raw.type) || "SPORTSFONDET",
    status: toCleanString(raw.status) || "PENDING",
    senderUsername: toCleanString(raw.senderUsername ?? raw.sender_username),
    respondedByUsername: toNullableString(raw.respondedByUsername ?? raw.responded_by_username),
    createdAt: toCleanString(raw.createdAt ?? raw.created_at),
    updatedAt: toCleanString(raw.updatedAt ?? raw.updated_at),
    currentOffer,
    offers,
  };
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Venter";
    case "COUNTERED":
      return "Motbud";
    case "ACCEPTED":
      return "Godkjent";
    case "DECLINED":
      return "Avslatt";
    default:
      return status || "Ukjent";
  }
}

const SportsfondetPage: React.FC = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const token = useMemo(() => readStoredJwt(), []);
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<ResponseAction | "ARCHIVE" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterDescription, setCounterDescription] = useState("");

  const fetchApplications = useCallback(async () => {
    if (!token) {
      setApplications([]);
      setError("Ikke innlogget.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/applications`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke hente soknader (${res.status})`));
      }

      const payload = (await res.json()) as unknown;
      const nextApplications = Array.isArray(payload)
        ? payload
            .map(normalizeListItem)
            .filter((entry): entry is ApplicationListItem => entry !== null)
            .filter((entry) => entry.type === "SPORTSFONDET")
            .sort((a, b) => {
              const aTime = new Date(a.updatedAt).getTime() || 0;
              const bTime = new Date(b.updatedAt).getTime() || 0;
              return bTime - aTime;
            })
        : [];

      setApplications(nextApplications);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente soknader.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, token]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  const openCreate = () => {
    setDescription("");
    setAmount("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createLoading) return;
    setCreateOpen(false);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCreateError("Belop ma vaere storre enn 0.");
      return;
    }

    if (!description.trim()) {
      setCreateError("Beskrivelse er pakrevd.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/applications`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "SPORTSFONDET",
          description: description.trim(),
          amount: parsedAmount,
        }),
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke sende soknad (${res.status})`));
      }

      setCreateOpen(false);
      await fetchApplications();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Kunne ikke sende soknad.");
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetail = async (applicationId: number) => {
    setSelected(null);
    setDetailError(null);
    setActionError(null);
    setCounterAmount("");
    setCounterDescription("");
    setDetailLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/${applicationId}`, {
        headers: authHeaders,
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke hente detaljer (${res.status})`));
      }

      const detail = normalizeDetail((await res.json()) as unknown);
      if (!detail) {
        throw new Error("Ugyldig svar fra backend.");
      }

      setSelected(detail);
      setCounterAmount(detail.currentOffer ? String(detail.currentOffer.amount) : "");
      setCounterDescription(detail.currentOffer?.description ?? "");
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : "Kunne ikke hente detaljer.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (actionLoading) return;
    setSelected(null);
    setDetailError(null);
    setActionError(null);
  };

  const refreshSelected = async (applicationId: number) => {
    await fetchApplications();
    await openDetail(applicationId);
  };

  const respond = async (action: ResponseAction) => {
    if (!selected) return;
    setActionError(null);

    const body: Record<string, unknown> = { action };
    if (action === "COUNTER") {
      const parsedAmount = Number(counterAmount.replace(",", "."));
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setActionError("Motbud ma ha et belop storre enn 0.");
        return;
      }
      body.amount = parsedAmount;
      const trimmedDescription = counterDescription.trim();
      if (trimmedDescription) body.description = trimmedDescription;
    }

    setActionLoading(action);
    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/${selected.id}/respond`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Handlingen feilet (${res.status})`));
      }

      await refreshSelected(selected.id);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Handlingen feilet.");
    } finally {
      setActionLoading(null);
    }
  };

  const archiveSelected = async () => {
    if (!selected) return;
    setActionError(null);
    setActionLoading("ARCHIVE");

    try {
      const res = await fetch(`${apiBaseUrl}/api/applications/${selected.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke arkivere (${res.status})`));
      }

      setSelected(null);
      await fetchApplications();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Kunne ikke arkivere.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="profilePage sportsfondetPage">
      <div className="bgGlow" />
      <main className="profileMain sportsfondetMain">
        <PageHeader title="Sportsfondet" subtitle="Soknader og motbud" showBack />

        <section className="section card sportsfondetCard">
          <div className="sportsfondetToolbar">
            <div>
              <div className="sectionTitle sportsfondetSectionTitle">Dine soknader</div>
              <p className="sportsfondetIntro">
                Send inn behov, folg status, og svar pa tilbud fra mottakere.
              </p>
            </div>
            <button type="button" className="loanPrimaryBtn sportsfondetCreateBtn" onClick={openCreate}>
              Ny soknad
            </button>
          </div>

          {loading ? (
            <p className="sportsfondetState">Laster soknader...</p>
          ) : error ? (
            <p className="sportsfondetState sportsfondetError">{error}</p>
          ) : applications.length === 0 ? (
            <p className="sportsfondetState">
              Ingen Sportsfondet-soknader funnet. Du ma ha SENDER/RECEIVER-tilgang i backend for a bruke funksjonen.
            </p>
          ) : (
            <div className="sportsfondetList">
              {applications.map((application) => (
                <article
                  key={application.id}
                  className="sportsfondetItem"
                  role="button"
                  tabIndex={0}
                  onClick={() => void openDetail(application.id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                      keyboardEvent.preventDefault();
                      void openDetail(application.id);
                    }
                  }}
                >
                  <div className="sportsfondetItemTop">
                    <div>
                      <div className="sportsfondetItemTitle">{application.currentDescription || "Sportsfondet-soknad"}</div>
                      <div className="sportsfondetItemMeta">
                        Fra {application.senderUsername || "ukjent"}
                        {application.respondedByUsername ? ` til ${application.respondedByUsername}` : ""}
                      </div>
                    </div>
                    <span className={`sportsfondetStatus status-${application.status.toLowerCase()}`}>
                      {statusLabel(application.status)}
                    </span>
                  </div>
                  <div className="sportsfondetAmountLine">
                    <span>Siste belop</span>
                    <strong>{formatNok(application.currentAmount)}</strong>
                  </div>
                  <div className="sportsfondetUpdated">{formatDate(application.updatedAt)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />

      {createOpen ? (
        <div className="loanModalBackdrop" onClick={closeCreate}>
          <div className="loanModal" onClick={(event) => event.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">Ny Sportsfondet-soknad</div>
              <button className="loanModalClose" type="button" onClick={closeCreate}>
                x
              </button>
            </div>

            <form className="loanForm" onSubmit={handleCreate}>
              <label className="formField">
                <span>Beskrivelse</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Hva trenger du stotte til?"
                  required
                />
              </label>
              <label className="formField">
                <span>Belop</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="500"
                  required
                />
              </label>
              <div className="formActions">
                <button type="submit" className="loanPrimaryBtn" disabled={createLoading}>
                  {createLoading ? "Sender..." : "Send soknad"}
                </button>
                <button type="button" className="loanGhostBtn" onClick={closeCreate} disabled={createLoading}>
                  Avbryt
                </button>
              </div>
              {createError ? <div className="formNotice error">{createError}</div> : null}
            </form>
          </div>
        </div>
      ) : null}

      {detailLoading || detailError || selected ? (
        <div className="loanModalBackdrop" onClick={closeDetail}>
          <div className="loanModal sportsfondetDetailModal" onClick={(event) => event.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">Soknadsdetaljer</div>
              <button className="loanModalClose" type="button" onClick={closeDetail}>
                x
              </button>
            </div>

            {detailLoading ? (
              <p className="sportsfondetState">Laster detaljer...</p>
            ) : detailError ? (
              <div className="formNotice error">{detailError}</div>
            ) : selected ? (
              <div className="sportsfondetDetail">
                <div className="sportsfondetDetailTop">
                  <span className={`sportsfondetStatus status-${selected.status.toLowerCase()}`}>
                    {statusLabel(selected.status)}
                  </span>
                  <strong>{selected.currentOffer ? formatNok(selected.currentOffer.amount) : formatNok(0)}</strong>
                </div>

                <div className="sportsfondetParties">
                  <span>Sender: {selected.senderUsername || "ukjent"}</span>
                  <span>Mottaker: {selected.respondedByUsername || "ikke valgt"}</span>
                </div>

                <div className="sportsfondetOffers">
                  {selected.offers.map((offer) => (
                    <div key={offer.id} className="sportsfondetOffer">
                      <div className="sportsfondetOfferTop">
                        <strong>{formatNok(offer.amount)}</strong>
                        <span>{offer.counterOffer ? "Motbud" : "Soknad"}</span>
                      </div>
                      <p>{offer.description || "Ingen beskrivelse"}</p>
                      <div className="sportsfondetOfferMeta">
                        {offer.offeredByUsername || "ukjent"} · {formatDate(offer.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>

                {selected.status === "PENDING" || selected.status === "COUNTERED" ? (
                  <form
                    className="loanForm sportsfondetCounterForm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void respond("COUNTER");
                    }}
                  >
                    <div className="formGrid">
                      <label className="formField">
                        <span>Motbud belop</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={counterAmount}
                          onChange={(event) => setCounterAmount(event.target.value)}
                        />
                      </label>
                      <label className="formField">
                        <span>Motbud tekst</span>
                        <input
                          type="text"
                          value={counterDescription}
                          onChange={(event) => setCounterDescription(event.target.value)}
                          placeholder="Valgfri kommentar"
                        />
                      </label>
                    </div>
                    <div className="sportsfondetActionGrid">
                      <button type="button" className="loanPrimaryBtn" onClick={() => void respond("ACCEPT")} disabled={!!actionLoading}>
                        {actionLoading === "ACCEPT" ? "Godkjenner..." : "Godkjenn"}
                      </button>
                      <button type="submit" className="loanGhostBtn" disabled={!!actionLoading}>
                        {actionLoading === "COUNTER" ? "Sender..." : "Send motbud"}
                      </button>
                      <button type="button" className="loanDangerBtn" onClick={() => void respond("DECLINE")} disabled={!!actionLoading}>
                        {actionLoading === "DECLINE" ? "Avslar..." : "Avsla"}
                      </button>
                    </div>
                  </form>
                ) : null}

                <button type="button" className="sportsfondetArchiveBtn" onClick={() => void archiveSelected()} disabled={!!actionLoading}>
                  {actionLoading === "ARCHIVE" ? "Arkiverer..." : "Arkiver"}
                </button>

                {actionError ? <div className="formNotice error">{actionError}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SportsfondetPage;
