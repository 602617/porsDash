import { useEffect, useState } from "react";
import { subscribeUser } from "./usePushNotifications";

const DISMISSED_KEY = "notif_prompt_dismissed";

export default function NotificationPrompt() {
  const [hidden, setHidden] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    const permission = Notification.permission;
    setHidden(dismissed || permission === "granted");
  }, []);

  const handleEnable = async () => {
    try {
      await subscribeUser();
      setStatus("Varsler aktivert.");
      setHidden(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div className="notifPrompt">
      <div className="notifPromptText">
        Slå på varsler for oppdateringer om booking og arrangement.
      </div>
      <div className="notifPromptActions">
        <button className="notifPromptBtn" onClick={handleEnable}>
          Aktiver varsler
        </button>
        <button className="notifPromptDismiss" onClick={handleDismiss}>
          Ikke naa
        </button>
      </div>
      {status ? <div className="notifPromptStatus">{status}</div> : null}
    </div>
  );
}
