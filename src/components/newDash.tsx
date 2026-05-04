import { useEffect, useMemo, useState } from "react";
import type { FC } from "react";
import { jwtDecode } from "jwt-decode";
import "../style/LoanPage.css";
import "../style/newDash.css";
import BottomNav from "./BottomNav";
import { Link } from "react-router-dom";
import NotificationPrompt from "./NotificationPrompt";
import { readStoredJwt } from "../utils/jwtToken";
import {
  type UserSearchResult,
  searchUsers,
  sendFriendRequest,
} from "../utils/friendships";

import notifyBell from "../assets/NotificationBell.png";

type JwtClaims = {
  sub?: string;
  username?: string;
  preferred_username?: string;
};

const NewDash: FC = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = useMemo(() => readStoredJwt(), []);
  const currentUsername = useMemo(() => {
    if (!token) return "";
    try {
      const decoded = jwtDecode<JwtClaims>(token);
      const identity = decoded.sub || decoded.username || decoded.preferred_username || "";
      return identity.trim().toLowerCase();
    } catch {
      return "";
    }
  }, [token]);

  const [friendQuery, setFriendQuery] = useState("");
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchError, setFriendSearchError] = useState<string | null>(null);
  const [friendResults, setFriendResults] = useState<UserSearchResult[]>([]);
  const [sendingRequestTo, setSendingRequestTo] = useState<number | null>(null);
  const [friendFeedback, setFriendFeedback] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.backgroundImage = "none";
    return () => {
      document.body.style.backgroundImage = "";
    };
  }, []);

  useEffect(() => {
    const query = friendQuery.trim();
    if (query.length < 2) {
      setFriendResults([]);
      setFriendSearchError(null);
      setFriendSearchLoading(false);
      return;
    }

    if (!token) {
      setFriendResults([]);
      setFriendSearchLoading(false);
      setFriendSearchError("Du må være innlogget for å søke brukere.");
      return;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      setFriendSearchLoading(true);
      setFriendSearchError(null);

      try {
        const users = await searchUsers(apiBaseUrl, token, query, controller.signal);
        const lowered = query.toLowerCase();
        const filtered = users
          .filter((candidate) => candidate.username.toLowerCase().includes(lowered))
          .filter((candidate) => candidate.username.toLowerCase() !== currentUsername)
          .slice(0, 8);
        setFriendResults(filtered);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Kunne ikke søke etter brukere.";
        setFriendSearchError(message);
        setFriendResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setFriendSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [apiBaseUrl, currentUsername, friendQuery, token]);

  const handleSendFriendRequest = async (user: UserSearchResult) => {
    if (!token || sendingRequestTo != null) return;

    setFriendFeedback(null);
    setFriendSearchError(null);
    setSendingRequestTo(user.id);

    try {
      const response = await sendFriendRequest(apiBaseUrl, token, user.id);
      const responseStatus = response?.status?.toUpperCase() || "PENDING";
      if (responseStatus === "ACCEPTED") {
        setFriendFeedback(`${user.username} er nå lagt til som venn.`);
      } else {
        setFriendFeedback(`Venneforespørsel sendt til ${user.username}.`);
      }
      setFriendResults((prev) => prev.filter((candidate) => candidate.id !== user.id));
      setFriendQuery("");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Kunne ikke sende venneforespørsel.";
      setFriendFeedback(message);
    } finally {
      setSendingRequestTo(null);
    }
  };

  const friendSearchHasDropdown =
    friendSearchLoading ||
    friendQuery.trim().length >= 2 ||
    friendSearchError != null ||
    friendResults.length > 0;

  return (
    <div>
      <div className="bgGlow" />
      <NotificationPrompt />
      <section className="top">
        <div className="split">
          <div className="left">
            <h1 className="app-title">Porsdash</h1>
            <div className="ownerLine">
              <span className="rolePill">
                <span className="roleIcon">P</span>
                <span className="roleLabel">Poeng</span>
                <span className="roleName">100</span>
              </span>
            </div>
          </div>
          <div className="right">
            <div className="dashFriendSearch">
              <label className="dashFriendLabel" htmlFor="dash-friend-search">
                Finn brukere
              </label>
              <input
                id="dash-friend-search"
                type="text"
                className="dashFriendInput"
                value={friendQuery}
                onChange={(event) => {
                  setFriendQuery(event.target.value);
                  setFriendFeedback(null);
                }}
                placeholder="Søk bruker"
                autoComplete="off"
              />
              {friendSearchHasDropdown ? (
                <div className="dashFriendDropdown">
                  {friendSearchLoading ? (
                    <div className="dashFriendState">Søker...</div>
                  ) : friendSearchError ? (
                    <div className="dashFriendState dashFriendStateError">{friendSearchError}</div>
                  ) : friendResults.length === 0 ? (
                    <div className="dashFriendState">Ingen brukere funnet.</div>
                  ) : (
                    friendResults.map((candidate) => (
                      <div key={candidate.id} className="dashFriendRow">
                        <span className="dashFriendName">{candidate.username}</span>
                        <button
                          type="button"
                          className="dashFriendAction"
                          onClick={() => {
                            void handleSendFriendRequest(candidate);
                          }}
                          disabled={sendingRequestTo !== null}
                        >
                          {sendingRequestTo === candidate.id ? "Sender..." : "Legg til"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              {friendFeedback ? <div className="dashFriendFeedback">{friendFeedback}</div> : null}
            </div>
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
        <div className="column">
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
        </div>
        <div className="column">
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
          <Link to="/game" className="dashboard-btn" style={{ animationDelay: "320ms" }}>
            <p>Dash Game</p>
            <span className="dashIcon roleIcon" aria-hidden="true">
              L
            </span>
          </Link>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default NewDash;
