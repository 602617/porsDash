import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/LoanPage.css";
import { triggerNotificationsRefresh } from "../utils/notificationsRefresh";
import { readStoredJwt } from "../utils/jwtToken";

type LoanPayment = {
  id: number;
  amount: number | string;
  paidAt: string;
  note?: string | null;
  createdBy?: string | null;
};

type LoanSummary = {
  loanId: number;
  principalAmount: number | string;
  sumPaid: number | string;
  sumLeft: number | string;
  history: LoanPayment[];
  title?: string;
  borrowerUsername?: string;
  lenderUsername?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function normalizeLoanFromListEntry(raw: unknown): LoanSummary | null {
  if (!isRecord(raw)) return null;

  const loanId = toInt(raw.id ?? raw.loanId);
  if (loanId == null) return null;
  const principalAmount =
    typeof raw.principalAmount === "number" || typeof raw.principalAmount === "string"
      ? raw.principalAmount
      : typeof raw.amount === "number" || typeof raw.amount === "string"
        ? raw.amount
        : 0;
  const sumPaid =
    typeof raw.sumPaid === "number" || typeof raw.sumPaid === "string" ? raw.sumPaid : 0;
  const sumLeft =
    typeof raw.sumLeft === "number" || typeof raw.sumLeft === "string" ? raw.sumLeft : 0;

  return {
    loanId,
    principalAmount,
    sumPaid,
    sumLeft,
    history: [],
    title: typeof raw.title === "string" ? raw.title : undefined,
    borrowerUsername: typeof raw.borrowerUsername === "string" ? raw.borrowerUsername : undefined,
    lenderUsername: typeof raw.lenderUsername === "string" ? raw.lenderUsername : undefined,
  };
}

function toNumber(v: number | string | undefined | null): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatNOK(amount: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nb-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function useRevealOnScroll(
  selector = "[data-reveal]",
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [selector, ...deps]);
}

function useCountUp(target: number, ms = 1200, startDelayMs = 250) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    let cancelled = false;

    const tick = (t: number) => {
      if (cancelled) return;
      if (start == null) start = t;

      const elapsed = t - start;
      const p = Math.min(1, elapsed / ms);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic

      setValue(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const timeout = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, ms, startDelayMs]);

  return value;
}

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Props = {
  loanId: number | string;
  baseUrl?: string; // e.g. import.meta.env.VITE_API_BASE_URL
  // if your filter expects raw token, set this false
  useBearerPrefix?: boolean;
};

export default function LoanPage({
  loanId,
  baseUrl = "",
  useBearerPrefix = true,
}: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<LoanSummary | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "unauthorized" | "forbidden" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const [isLimitedView, setIsLimitedView] = useState(false);

  useRevealOnScroll("[data-reveal]", [status]);

  const token = useMemo(() => readStoredJwt(), []);
  const authHeader = useMemo(
    () => (useBearerPrefix ? `Bearer ${token}` : token),
    [token, useBearerPrefix]
  );

  const [formAmount, setFormAmount] = useState("");
  const [formPaidAt, setFormPaidAt] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [formMsg, setFormMsg] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<LoanPayment | null>(null);
  const [actionStatus, setActionStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [actionMsg, setActionMsg] = useState("");

  const fetchLoan = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!token) {
        setStatus("unauthorized");
        return;
      }

      if (!opts.silent) {
        setStatus("loading");
        setErrMsg("");
        setIsLimitedView(false);
      }

      try {
        const res = await fetch(`${baseUrl}/api/loans/${loanId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (res.status === 401) {
          setStatus("unauthorized");
          return;
        }
        if (res.status === 403) {
          // Legacy fallback for loans created before newer detail permission changes.
          const fallbackEndpoints = [`${baseUrl}/api/loans`];
          const requestedLoanId = toInt(loanId);

          for (const endpoint of fallbackEndpoints) {
            try {
              const listRes = await fetch(endpoint, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: authHeader,
                },
              });
              if (!listRes.ok) continue;

              const listPayload = (await listRes.json()) as unknown;
              if (!Array.isArray(listPayload)) continue;

              const matchedRaw = listPayload.find((entry) => {
                if (!isRecord(entry)) return false;
                const entryId = toInt(entry.id ?? entry.loanId);
                if (entryId == null) return false;
                if (requestedLoanId != null) return entryId === requestedLoanId;
                return String(entryId) === String(loanId);
              });

              const fallbackLoan = normalizeLoanFromListEntry(matchedRaw);
              if (!fallbackLoan) continue;

              setData(fallbackLoan);
              setStatus("ok");
              setIsLimitedView(true);
              setErrMsg(
                "Viser begrenset oversikt: detaljendepunktet returnerte 403 for dette laanet."
              );
              return;
            } catch {
              // Keep trying remaining fallback endpoints.
            }
          }

          setStatus("forbidden");
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          setStatus("error");
          setErrMsg(text || `Request failed: ${res.status}`);
          return;
        }

        const json = (await res.json()) as LoanSummary;
        setData(json);
        setStatus("ok");
        setIsLimitedView(false);
        if (!opts.silent) {
          setErrMsg("");
        }
      } catch (e: unknown) {
        setStatus("error");
        setErrMsg(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [authHeader, baseUrl, loanId, token]
  );

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const principal = useMemo(() => toNumber(data?.principalAmount), [data]);
  const sumPaid = useMemo(() => toNumber(data?.sumPaid), [data]);
  const sumLeft = useMemo(() => Math.max(0, toNumber(data?.sumLeft)), [data]);
  const leftAnimated = useCountUp(status === "ok" ? sumLeft : 0, 1300, 300);
  const progress = principal > 0 ? Math.min(1, sumPaid / principal) : 0;

  const title = data?.title || "Private Loan";
  const ownerInfo = useMemo(() => {
    const b = data?.borrowerUsername || "Unknown";
    const l = data?.lenderUsername || "Unknown";
    return { borrower: b, lender: l };
  }, [data]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="loanPage">
        <div className="bgGlow" />
        <div className="top">
          <div className="chip shimmer">Loading loan…</div>
          <div className="skeleton hero" />
          <div className="skeleton line" />
          <div className="skeleton line short" />
        </div>
        <div className="section skeletonCard" />
        <div className="section skeletonCard" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="loanPage">
        <div className="bgGlow" />
        <div className="centerCard">
          <div className="lockIcon">👤</div>
          <h1>Not logged in</h1>
          <p>You need to log in to view this loan.</p>
          <div className="hint">
            Missing or expired JWT in <b>localStorage</b> (<span className="monoInline">jwt</span>).
          </div>
        </div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="loanPage">
        <div className="bgGlow" />
        <div className="centerCard">
          <div className="lockIcon">🔒</div>
          <h1>Access denied</h1>
          <p>Only the borrower and lender can view this loan.</p>
          <div className="hint">Log in with the correct user account.</div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="loanPage">
        <div className="bgGlow" />
        <div className="centerCard">
          <div className="lockIcon">⚠️</div>
          <h1>Something went wrong</h1>
          <p className="mono">{errMsg}</p>
          <div className="hint">
            If you get 401/403 unexpectedly, confirm your backend expects{" "}
            <b>{useBearerPrefix ? "Bearer token" : "raw token"}</b>.
          </div>
        </div>
      </div>
    );
  }

  const history = data?.history ?? [];
  const resetForm = (opts: { keepNotice?: boolean } = {}) => {
    setFormAmount("");
    setFormPaidAt("");
    setFormNote("");
    setFormMode("create");
    setEditingId(null);
    if (!opts.keepNotice) {
      setFormStatus("idle");
      setFormMsg("");
    }
  };

  const handleEdit = (payment: LoanPayment) => {
    setFormMode("edit");
    setEditingId(payment.id);
    setFormAmount(String(payment.amount ?? ""));
    setFormPaidAt(payment.paidAt ? toLocalDateTimeInput(payment.paidAt) : "");
    setFormNote(payment.note ? String(payment.note) : "");
    setFormStatus("idle");
    setFormMsg("");
    setIsFormOpen(true);
  };

  const applyMonthlyNote = () => {
    setFormNote("Fast månedlig betaling");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formAmount.trim()) {
      setFormStatus("error");
      setFormMsg("Amount is required.");
      return;
    }

    const paidAtIso = formPaidAt ? new Date(formPaidAt).toISOString() : undefined;
    const note = formNote.trim();
    const payload = {
      amount: formAmount.trim(),
      paidAt: paidAtIso,
      note: note ? note : undefined,
    };

    setFormStatus("submitting");
    setFormMsg("");

    const endpoint =
      formMode === "edit" && editingId != null
        ? `${baseUrl}/api/loans/payments/${editingId}`
        : `${baseUrl}/api/loans/${loanId}/payments`;
    const method = formMode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setFormStatus("error");
        setFormMsg(text || `Request failed: ${res.status}`);
        return;
      }

      await fetchLoan({ silent: true });
      setFormStatus("success");
      setFormMsg(formMode === "edit" ? "Payment updated." : "Payment added.");
      resetForm({ keepNotice: true });
      setIsFormOpen(false);
      triggerNotificationsRefresh(formMode === "edit" ? "loan:payment:update" : "loan:payment:create");
    } catch (e: unknown) {
      setFormStatus("error");
      setFormMsg(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleDelete = async (paymentId: number) => {
    setActionStatus("submitting");
    setActionMsg("");
    try {
      const res = await fetch(`${baseUrl}/api/loans/payments/${paymentId}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      });

      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => "");
        setActionStatus("error");
        setActionMsg(text || `Delete failed: ${res.status}`);
        return;
      }

      await fetchLoan({ silent: true });
      setActionStatus("success");
      setActionMsg("Payment deleted.");
      if (editingId === paymentId) resetForm({ keepNotice: true });
      setIsActionOpen(false);
      triggerNotificationsRefresh("loan:payment:delete");
    } catch (e: unknown) {
      setActionStatus("error");
      setActionMsg(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const openAddModal = () => {
    resetForm();
    setFormPaidAt(toLocalDateTimeInput(new Date().toISOString()));
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const openActionModal = (payment: LoanPayment) => {
    setSelectedPayment(payment);
    setActionStatus("idle");
    setActionMsg("");
    setIsActionOpen(true);
  };

  const closeActionModal = () => {
    setIsActionOpen(false);
    setActionStatus("idle");
    setActionMsg("");
  };

  return (
    <div className="loanPage">
      <div className="bgGlow" />

      <div className="miniBar">
        <div className="miniLeft">
          <button
            className="miniBackBtn"
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Tilbake"
          >
            &larr;
          </button>
        </div>
        <div className="miniTitle">{title}</div>
        <div className="miniRight">
          <button
            className="miniAction"
            type="button"
            onClick={openAddModal}
            disabled={isLimitedView}
            title={isLimitedView ? "Betalingshandlinger er utilgjengelige i begrenset visning." : undefined}
          >
            +
          </button>
        </div>
      </div>

      <header className="hero">
        <div className="heroTop">
          
          <div className="ownerLine">
            <span className="rolePill">
              <span className="roleIcon">B</span>
              <span className="roleLabel">Borrower</span>
              <span className="roleName">{ownerInfo.borrower}</span>
            </span>
            <span className="rolePill">
              <span className="roleIcon">L</span>
              <span className="roleLabel">Lender</span>
              <span className="roleName">{ownerInfo.lender}</span>
            </span>
          </div>
        </div>

        <div className="bigReveal">
          <div className="bigLabel">Left to pay</div>
          <div className="bigAmount">{formatNOK(leftAnimated)}</div>

          <div
            className="progressWrap"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${progress * 100}%` }} />
              <div className="progressGlow" style={{ left: `calc(${progress * 100}% - 14px)` }} />
            </div>
            <div className="progressMeta">
              <span>{formatNOK(sumPaid)} paid</span>
              <span>{formatNOK(principal)} total</span>
            </div>
          </div>

          <div className="hintScroll">
            <span className="chev">v</span>
            <span>Scroll for details</span>
          </div>
        </div>
      </header>

      <section className="section card" data-reveal>
        <div className="sectionTitle">Overview</div>

        <div className="statsGrid">
          <div className="stat">
            <div className="statLabel">Total</div>
            <div className="statValue">{formatNOK(principal)}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Paid</div>
            <div className="statValue">{formatNOK(sumPaid)}</div>
          </div>
          <div className="stat">
            <div className="statLabel">Remaining</div>
            <div className="statValue emphasize">{formatNOK(sumLeft)}</div>
          </div>
        </div>
      </section>

      <section className="section card" data-reveal>
        <div className="sectionTitle">Payment history</div>

        {isLimitedView ? (
          <div className="formNotice error">{errMsg}</div>
        ) : history.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">🧾</div>
            <div className="emptyText">No payments yet.</div>
          </div>
        ) : (
          <div className="list">
            {history.map((p, idx) => {
              const amount = toNumber(p.amount);
              const isMonthlyNote = p.note === "Fast månedlig betaling";
              return (
                <div
                  className={`row${isMonthlyNote ? " rowMonthly" : ""}`}
                  key={p.id}
                  style={{ animationDelay: `${80 + idx * 45}ms` }}
                >
                  <div className="rowLeft">
                    <div className="rowAmount">{formatNOK(amount)}</div>
                    <div className="rowMeta">
                      <span>{formatDate(p.paidAt)}</span>
                      {p.createdBy ? <span className="dot">•</span> : null}
                      {p.createdBy ? <span className="by">{p.createdBy}</span> : null}
                    </div>
                    {p.note ? <div className="rowNote">{p.note}</div> : null}
                  </div>
                  <div className="rowRight">
                    <button className="rowMenu" type="button" onClick={() => openActionModal(p)}>
                      ...
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section card subtle" data-reveal>
        <div className="sectionTitle">Privacy</div>
        <p className="fine">
          Only the <b>borrower</b> and <b>lender</b> can view or change this loan.
        </p>
      </section>

      {isFormOpen ? (
        <div className="loanModalBackdrop" onClick={closeFormModal}>
          <div className="loanModal" onClick={(e) => e.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">
                {formMode === "edit" ? "Edit payment" : "Add payment"}
              </div>
              <button
                className="loanModalClose"
                type="button"
                onClick={closeFormModal}
              >x</button>
            </div>
            <form className="loanForm" onSubmit={handleSubmit}>
              <div className="formGrid">
                <label className="formField">
                  <span>Amount</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0"
                    required
                  />
                </label>
                <label className="formField">
                  <span>Paid at (optional)</span>
                  <input
                    type="datetime-local"
                    value={formPaidAt}
                    onChange={(e) => setFormPaidAt(e.target.value)}
                  />
                </label>
              </div>
              <label className="formField">
                <span>Note (optional)</span>
                <button className="noteQuickBtn" type="button" onClick={applyMonthlyNote}>
                  Fast månedlig betaling
                </button>
                <textarea
                  rows={3}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Add a note for this payment"
                />
              </label>
              <div className="formActions">
                <button
                  className="loanPrimaryBtn"
                  type="submit"
                  disabled={formStatus === "submitting"}
                >
                  {formMode === "edit" ? "Save changes" : "Add payment"}
                </button>
                {formMode === "edit" ? (
                  <button
                    className="loanGhostBtn"
                    type="button"
                    onClick={() => {
                      closeFormModal();
                    }}
                    disabled={formStatus === "submitting"}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              {formMsg ? (
                <div className={`formNotice ${formStatus}`}>{formMsg}</div>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      {isActionOpen && selectedPayment ? (
        <div className="loanModalBackdrop" onClick={closeActionModal}>
          <div className="loanModal small" onClick={(e) => e.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">Payment #{selectedPayment.id}</div>
              <button
                className="loanModalClose"
                type="button"
                onClick={closeActionModal}
              >x</button>
            </div>
            <div className="actionButtons">
              <button
                className="loanPrimaryBtn"
                type="button"
                onClick={() => {
                  setIsActionOpen(false);
                  handleEdit(selectedPayment);
                }}
              >
                Edit payment
              </button>
              <button
                className="loanDangerBtn"
                type="button"
                onClick={() => handleDelete(selectedPayment.id)}
                disabled={actionStatus === "submitting"}
              >
                Delete payment
              </button>
            </div>
            {actionMsg ? (
              <div className={`formNotice ${actionStatus}`}>{actionMsg}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="bottomSpace" />
    </div>
  );
}
