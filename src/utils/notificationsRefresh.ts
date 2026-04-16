const NOTIFICATIONS_REFRESH_EVENT = "porsdash:notifications-refresh";

export function triggerNotificationsRefresh(reason?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_REFRESH_EVENT, {
      detail: {
        reason: reason || "manual",
        at: Date.now(),
      },
    })
  );
}

export function onNotificationsRefresh(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, listener);
  return () => {
    window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, listener);
  };
}

