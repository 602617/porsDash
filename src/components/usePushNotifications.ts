const vapidPublicKey =
  'BBxrxH_ezwzArIMPuGbfqYUGnNFEJnjgc-XY2Oxzj8mZncaZYVXcrS1lzODR9cdJCqtO1Tdc1ixhtvck11_WCMs'
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
function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  }) as Promise<T>
}

async function getPushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js')
  if (existing) {
    console.log('[push] Using existing /sw.js registration', existing.scope)
    await navigator.serviceWorker.ready
    console.log('[push] Service worker ready', existing.active?.state)
    return existing
  }
  console.log('[push] Registering /sw.js service worker')
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  console.log('[push] Service worker ready after register', registration.active?.state)
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
  let sub: PushSubscription
  try {
    const appServerKey = urlBase64ToUint8Array(vapidPublicKey)
    console.log('[push] VAPID key length:', appServerKey.byteLength)
    sub = await withTimeout(
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      }),
      10000,
      'Push-abonnement tok for lang tid. Proev aa oppdatere siden.'
    )
  } catch (err) {
    console.error('[push] Failed to create subscription', err)
    const message = err instanceof Error ? err.message : 'Ukjent feil ved abonnement.'
    throw new Error(message)
  }
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



