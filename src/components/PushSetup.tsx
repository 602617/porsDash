import { useEffect } from 'react';

const publicVapidKey = 'BJYjlp1dkO_SZuFDrqFyyoa6k8M6ESRaixm3Bg0lkjzwCusuB9M-w-s-k8w9eHdKLZ3E7D0PTu5WS3UXWxZEr1A';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSetup() {
  useEffect(() => {
    async function subscribe() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });

        // Send to backend
        await fetch('http://localhost:8080/api/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    subscribe();
  }, []);

  return null;
}
