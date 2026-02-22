const vapidPublicKey = "BOQL-1ki3v1P3cf65Yey4tZqFvXjjpOlk5xGZp75M-YB2C8hyPhdir0XP560gJ0EaroD5hdAoeXigzs2p1GmrNA";

export async function subscribeUser() {
  // 1. Be om tillatelse
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  // 2. Hent SW-registreringen
  const reg = await navigator.serviceWorker.ready

  // 3. Abonner på PushManager
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey
  })

  // 4. Send abonnementet til backend
  const token = localStorage.getItem("jwt") || "";
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sub)
  })

  return sub
}
