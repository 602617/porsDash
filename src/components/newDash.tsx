import { useEffect, useState } from "react";
import type { FC } from "react";
import "../style/LoanPage.css";
import "../style/newDash.css";
import BottomNav from "./BottomNav";
import { Link } from "react-router-dom";
import NotificationPrompt from "./NotificationPrompt";
import { isCurrentUserAdmin } from "../utils/adminAccess";

import notifyBell from "../assets/NotificationBell.png";

type ScoreResponse = {
  username: string;
  totalPoints: number;
  history: {
    id: number;
    action: string;
    points: number;
    createdAt: string;
  }[];
};

function formatScoreAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatScoreDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const NewDash: FC = () => {
  const isAdmin = isCurrentUserAdmin();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [isScoreHistoryOpen, setIsScoreHistoryOpen] = useState(false);
  const score = scoreData?.totalPoints ?? null;
  const scoreHistory = scoreData?.history ?? [];

  useEffect(() => {
    document.body.style.backgroundImage = "none";
    return () => {
      document.body.style.backgroundImage = "";
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("jwt") || "";
    if (!apiBaseUrl || !token) {
      setScoreData({ username: "", totalPoints: 0, history: [] });
      return;
    }

    let cancelled = false;

    async function fetchScore() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/score`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Could not fetch score: ${res.status}`);
        }

        const data = (await res.json()) as ScoreResponse;
        if (!cancelled) {
          setScoreData({
            ...data,
            totalPoints: data.totalPoints ?? 0,
            history: Array.isArray(data.history) ? data.history : [],
          });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setScoreData({ username: "", totalPoints: 0, history: [] });
        }
      }
    }

    fetchScore();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <div>
      <div className="bgGlow" />
      <NotificationPrompt />
      <section className="top">
        <div className="split">
          <div className="left">
            <h1 className="app-title">Porsdash</h1>
            <div className="ownerLine">
              <button
                type="button"
                className="rolePill scorePill"
                onClick={() => setIsScoreHistoryOpen(true)}
                aria-label="Vis poenghistorikk"
              >
                <span className="roleIcon">P</span>
                <span className="roleLabel">Poeng</span>
                <span className="roleName">{score === null ? "..." : score}</span>
              </button>
            </div>
          </div>
          <div className="right">
            <img src={notifyBell} alt="Notifications" className="dashBellIcon" />
          </div>
        </div>

        <svg className="wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,90 C240,50 480,0 720,40 C960,80 1200,120 1440,60 L1440,120 L0,120 Z"
            fill="#ffffff"
          ></path>
        </svg>
      </section>

      <section className="bottom">
        <Link to="/items" className="dashboard-btn" style={{ animationDelay: "80ms" }}>
          <p>Booking</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            B
          </span>
        </Link>
        <Link to="/dugnad" className="dashboard-btn" style={{ animationDelay: "160ms" }}>
          <p>Arrangement</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            A
          </span>
        </Link>
        <Link to="/myproducts" className="dashboard-btn" style={{ animationDelay: "240ms" }}>
          <p>Mine produkter</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            M
          </span>
        </Link>
        <Link to="/loans" className="dashboard-btn" style={{ animationDelay: "320ms" }}>
          <p>Lån</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            L
          </span>
        </Link>
        <Link to="/sportsfondet" className="dashboard-btn" style={{ animationDelay: "400ms" }}>
          <p>Sportsfondet</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            S
          </span>
        </Link>
        {isAdmin ? (
          <Link to="/timeregistrering" className="dashboard-btn" style={{ animationDelay: "480ms" }}>
            <p>Timeregistrering</p>
            <span className="dashIcon roleIcon" aria-hidden="true">
              T
            </span>
          </Link>
        ) : null}
        <Link to="/game" className="dashboard-btn" style={{ animationDelay: "560ms" }}>
          <p>Dash Game</p>
          <span className="dashIcon roleIcon" aria-hidden="true">
            L
          </span>
        </Link>
      </section>

      {isScoreHistoryOpen ? (
        <div className="loanModalBackdrop" onClick={() => setIsScoreHistoryOpen(false)}>
          <div
            className="loanModal scoreHistoryModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scoreHistoryTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="loanModalHeader">
              <div>
                <div id="scoreHistoryTitle" className="loanModalTitle">
                  Poenghistorikk
                </div>
                <div className="scoreHistoryTotal">{scoreData?.totalPoints ?? 0} poeng totalt</div>
              </div>
              <button
                type="button"
                className="loanModalClose"
                onClick={() => setIsScoreHistoryOpen(false)}
                aria-label="Lukk"
              >
                x
              </button>
            </div>

            {scoreHistory.length === 0 ? (
              <div className="scoreHistoryEmpty">Ingen poeng enda.</div>
            ) : (
              <div className="scoreHistoryList">
                {scoreHistory.map((entry) => (
                  <div key={entry.id} className="scoreHistoryRow">
                    <div>
                      <div className="scoreHistoryAction">{formatScoreAction(entry.action)}</div>
                      <div className="scoreHistoryDate">{formatScoreDate(entry.createdAt)}</div>
                    </div>
                    <div className="scoreHistoryPoints">+{entry.points}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
};

export default NewDash;
