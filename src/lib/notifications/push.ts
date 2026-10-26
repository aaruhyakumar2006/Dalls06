export async function subscribeUserToPush(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window undefined' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications are not supported in this browser' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied' };
    }

    // Fetch VAPID key
    const res = await fetch('/api/notifications/vapid-key');
    if (!res.ok) {
      // Local fallback
      new Notification('Match Point', {
        body: 'Local notifications enabled! Reminders will arrive here.',
        icon: '/icons/icon-192.png',
      });
      return { success: true };
    }

    const data = await res.json();
    if (!data.publicKey) {
      new Notification('Match Point', {
        body: 'Local notifications enabled! Reminders will arrive here.',
        icon: '/icons/icon-192.png',
      });
      return { success: true };
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: data.publicKey,
    });

    const subJson = subscription.toJSON();
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      }),
    });

    return { success: true };
  } catch (err: any) {
    console.warn('Push subscription error:', err);
    return { success: false, error: err.message || 'Subscription failed' };
  }
}
