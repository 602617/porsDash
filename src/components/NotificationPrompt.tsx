import { useEffect, useState } from "react";
import { subscribeUser, testPushNotification } from "./usePushNotifications";

const DISMISSED_KEY = "notif_prompt_dismissed";

export default function NotificationPrompt() {
  const [hidden, setHidden] = useState(true);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    const permission = Notification.permission;
    setHidden(dismissed || permission === "granted");
  }, []);

  const handleEnable = async () => {
    setStatus("");
    setIsSubmitting(true);
    try {
      await subscribeUser();
      setStatus("Varsler aktivert.");
      setHidden(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setStatus("");
    setIsTesting(true);
    try {
      await testPushNotification();
      setStatus("Test-varsel sendt.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setIsTesting(false);
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
        <button className="notifPromptBtn" onClick={handleEnable} disabled={isSubmitting}>
          {isSubmitting ? "Aktiverer..." : "Aktiver varsler"}
        </button>
        <button className="notifPromptBtn" onClick={handleTest} disabled={isTesting}>
          {isTesting ? "Tester..." : "Test push notification"}
        </button>
        <button className="notifPromptDismiss" onClick={handleDismiss}>
          Ikke nå
        </button>
      </div>
      {status ? <div className="notifPromptStatus">{status}</div> : null}
    </div>
  );
}
