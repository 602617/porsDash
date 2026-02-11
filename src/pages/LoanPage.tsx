import { useEffect, useMemo, useRef, useState } from "react";
import "../style/LoanPage.css";

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
  const [data, setData] = useState<LoanSummary | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "unauthorized" | "forbidden" | "error"
  >("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  useRevealOnScroll("[data-reveal]", [status]);

  const token = useMemo(() => localStorage.getItem("jwt") || "", []);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!token) {
        setStatus("unauthorized");
        return;
      }

      setStatus("loading");
      setErrMsg("");

      try {
        const authHeader = useBearerPrefix ? `Bearer ${token}` : token;

        const res = await fetch(`${baseUrl}/api/loans/${loanId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (!alive) return;

        if (res.status === 401) {
          setStatus("unauthorized");
          return;
        }
        if (res.status === 403) {
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
      } catch (e: unknown) {
        if (!alive) return;
        setStatus("error");
        setErrMsg(e instanceof Error ? e.message : "Unknown error");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [baseUrl, loanId, token, useBearerPrefix]);

  const principal = useMemo(() => toNumber(data?.principalAmount), [data]);
  const sumPaid = useMemo(() => toNumber(data?.sumPaid), [data]);
  const sumLeft = useMemo(() => Math.max(0, toNumber(data?.sumLeft)), [data]);
  const leftAnimated = useCountUp(status === "ok" ? sumLeft : 0, 1300, 300);
  const progress = principal > 0 ? Math.min(1, sumPaid / principal) : 0;

  const title = data?.title || "Private Loan";
  const ownerLine = useMemo(() => {
    const b = data?.borrowerUsername;
    const l = data?.lenderUsername;
    if (b && l) return `${b} ↔ ${l}`;
    return "Borrower ↔ Lender";
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

  return (
    <div className="loanPage">
      <div className="bgGlow" />

      <div className="miniBar">
        <div className="miniTitle">{title}</div>
        <div className="miniRight">
          <div className="miniPill">{formatNOK(sumLeft)} left</div>
        </div>
      </div>

      <header className="hero">
        <div className="heroTop">
          <div className="chip">{title}</div>
          <div className="sub">{ownerLine}</div>
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

        {history.length === 0 ? (
          <div className="empty">
            <div className="emptyIcon">🧾</div>
            <div className="emptyText">No payments yet.</div>
          </div>
        ) : (
          <div className="list">
            {history.map((p, idx) => {
              const amount = toNumber(p.amount);
              return (
                <div className="row" key={p.id} style={{ animationDelay: `${80 + idx * 45}ms` }}>
                  <div className="rowLeft">
                    <div className="rowAmount">{formatNOK(amount)}</div>
                    <div className="rowMeta">
                      <span>{formatDate(p.paidAt)}</span>
                      {p.createdBy ? <span className="dot">•</span> : null}
                      {p.createdBy ? <span className="by">{p.createdBy}</span> : null}
                    </div>
                    {p.note ? <div className="rowNote">{p.note}</div> : null}
                  </div>
                  <div className="rowBadge">#{p.id}</div>
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
          Anyone else will still get <b>403 Forbidden</b>.
        </p>
      </section>

      <div className="bottomSpace" />
    </div>
  );
}
