export async function subscribeUser() {
  // 1. Be om tillatelse
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  // 2. Hent SW-registreringen
  const reg = await navigator.serviceWorker.ready

  // 3. Abonner på PushManager
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'DIN_VAPID_PUBLIC_KEY'  // Base64-url-encoded
  })

  // 4. Send abonnementet til backend
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  })

  return sub
}
