import { useState } from "react";
import { subscribeUser, testPushNotification, unsubscribeUser } from "./usePushNotifications";

export default function PushNotificationSettings() {
  const [status, setStatus] = useState<string>("");
  const [enabled, setEnabled] = useState(false);
  const enablePushNotifications = async () => {
    try {
      await subscribeUser();
      setEnabled(true);
      setStatus("Varsler aktivert.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    }
  };

  const sendTestNotification = async () => {
    try {
      await testPushNotification();
      setStatus("Testvarsel sendt.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    }
  };

  const disablePushNotifications = async () => {
    try {
      await unsubscribeUser();
      setEnabled(false);
      setStatus("Varsler deaktivert.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    }
  };

  return (
    <div className="pushSettings">
      <div className="sectionTitle">Varsler</div>
      <button className="profileNotify" onClick={enablePushNotifications}>
        Enable notifications
      </button>
      {enabled ? <div className="pushStatus">Notifications enabled ✅</div> : null}
      <button className="profileNotify" onClick={disablePushNotifications}>
        Disable notifications
      </button>
      <button className="profileNotify" onClick={sendTestNotification}>
        Send test notification
      </button>
      {status ? <div className="pushStatus">{status}</div> : null}
    </div>
  );
}
