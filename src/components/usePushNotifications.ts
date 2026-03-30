const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
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

function sameKey(a: ArrayBuffer | null, b: Uint8Array) {
  if (!a) return false
  const left = new Uint8Array(a)
  if (left.byteLength !== b.byteLength) return false
  for (let i = 0; i < left.byteLength; i += 1) {
    if (left[i] !== b[i]) return false
  }
  return true
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
  if (!vapidPublicKey) {
    throw new Error('VAPID public key mangler. Sett VITE_VAPID_PUBLIC_KEY.')
  }
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

  // 2. Hent SW-registreringen og abonnementet
  const reg = await getPushRegistration()
  console.log('[push] Registration scope:', reg.scope)
  const appServerKey = urlBase64ToUint8Array(vapidPublicKey)
  let sub = await reg.pushManager.getSubscription()
  if (sub) {
    const existingKey = sub.options?.applicationServerKey ?? null
    if (!sameKey(existingKey, appServerKey)) {
      console.log('[push] Existing subscription uses old VAPID key, resubscribing')
      await sub.unsubscribe()
      sub = null
    } else {
      console.log('[push] Reusing existing subscription')
      console.log('[push] Subscription endpoint:', sub.endpoint)
    }
  }

  if (!sub) {
    console.log('[push] Creating new subscription')
    try {
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
  }

  // 3. Send abonnementet til backend
  const payload = sub.toJSON()
  if (!payload.endpoint || !payload.keys) {
    throw new Error('Ugyldig push-abonnement.')
  }
  const token = localStorage.getItem('jwt') || ''
  console.log('[push] Sending subscription to backend')
  const res = await fetch(`${apiBaseUrl}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: payload.endpoint,
      keys: payload.keys,
    }),
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
    body: JSON.stringify({ endpoint: sub.endpoint }),
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



