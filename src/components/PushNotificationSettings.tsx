import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationSettings() {
  const [status, setStatus] = useState<string>("");
  const [enabled, setEnabled] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  const enablePushNotifications = async () => {
    try {
      const jwt = localStorage.getItem("jwt");
      if (!jwt) {
        setStatus("Logg inn for a aktivere varsler.");
        return;
      }
      if (!("serviceWorker" in navigator)) {
        setStatus("Service worker ikke tilgjengelig i denne nettleseren.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Varsler er ikke tillatt.");
        return;
      }

      if (!vapidKey) {
        setStatus("Mangler VAPID public key.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch(`${apiBaseUrl}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(sub),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      setEnabled(true);
      setStatus("Varsler aktivert.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ukjent feil");
    }
  };

  const sendTestNotification = async () => {
    try {
      const jwt = localStorage.getItem("jwt");
      if (!jwt) {
        setStatus("Logg inn for a sende test.");
        return;
      }
      const res = await fetch(`${apiBaseUrl}/api/notifications/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ message: "Test", url: "/" }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      setStatus("Testvarsel sendt.");
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
      <button className="profileNotify" onClick={sendTestNotification}>
        Send test notification
      </button>
      {status ? <div className="pushStatus">{status}</div> : null}
    </div>
  );
}
