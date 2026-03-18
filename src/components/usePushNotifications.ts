const vapidPublicKey =
  'BOQL-1ki3v1P3cf65Yey4tZqFvXjjpOlk5xGZp75M-YB2C8hyPhdir0XP560gJ0EaroD5hdAoeXigzs2p1GmrNA'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

async function getPushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js')
  if (existing) {
    console.log('[push] Using existing /sw.js registration', existing.scope)
    await navigator.serviceWorker.ready
    return existing
  }
  console.log('[push] Registering /sw.js service worker')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return registration
}

export async function subscribeUser() {
  console.log('[push] subscribeUser called')
  if (!('Notification' in window)) {
    throw new Error('Varsler er ikke tilgjengelig i denne nettleseren.')
  }
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service worker stottes ikke i denne nettleseren.')
  }
  if (!('PushManager' in window)) {
    throw new Error('Push stottes ikke i denne nettleseren.')
  }

  // 1. Be om tillatelse
  console.log('[push] Requesting notification permission')
  const permission = await Notification.requestPermission()
  console.log('[push] Permission result:', permission)
  if (permission !== 'granted') {
    throw new Error(`Varsler er blokkert i nettleseren (${permission}).`)
  }

  // 2. Hent SW-registreringen
  const reg = await getPushRegistration()
  console.log('[push] Registration scope:', reg.scope)
  const existingSub = await reg.pushManager.getSubscription()
  if (existingSub) {
    console.log('[push] Reusing existing subscription')
    console.log('[push] Subscription endpoint:', existingSub.endpoint)
    return existingSub
  }

  // 3. Abonner på PushManager
  console.log('[push] Creating new subscription')
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  console.log('[push] Subscription endpoint:', sub.endpoint)

  // 4. Send abonnementet til backend
  const token = localStorage.getItem('jwt') || ''
  console.log('[push] Sending subscription to backend')
  const res = await fetch(`${apiBaseUrl}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sub),
  })
  console.log('[push] Subscribe response status:', res.status)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Kunne ikke lagre push-abonnement.')
  }

  return sub
}

export async function unsubscribeUser() {
  console.log('[push] unsubscribeUser called')
  const reg = await getPushRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) {
    console.log('[push] No subscription to unsubscribe')
    return null
  }
  console.log('[push] Subscription endpoint:', sub.endpoint)

  const token = localStorage.getItem('jwt') || ''
  console.log('[push] Unsubscribing and notifying backend')
  const res = await fetch(`${apiBaseUrl}/api/push/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sub),
  })
  console.log('[push] Unsubscribe response status:', res.status)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Kunne ikke fjerne push-abonnement.')
  }

  await sub.unsubscribe()
  return true
}

export async function testPushNotification() {
  console.log('[push] testPushNotification called')
  await subscribeUser()
  const token = localStorage.getItem('jwt') || ''
  console.log('[push] Sending test push request')
  const res = await fetch(`${apiBaseUrl}/api/push/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  console.log('[push] Test push response status:', res.status)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Kunne ikke sende test-varsel.')
  }
  return true
}
