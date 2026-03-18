self.addEventListener('push', (event) => {
  let data = {
    title: 'Notification',
    body: 'You have a new update',
    url: '/',
  }

  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (err) {
    data = {
      title: 'Notification',
      body: 'You have a new update',
      url: '/',
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body || '',
      icon: '/icon.png',
      data: {
        url: data.url || '/',
      },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification?.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
