/* HPT V134: opt-in Web Push notifications for authenticated provider administrators. */
(() => {
  'use strict';
  const C = window.RAJU_HPT_CONFIG;
  const button = document.getElementById('hptAdminPushToggle');
  const status = document.getElementById('hptAdminPushStatus');
  if (!button || !status || !window.supabase?.createClient || !C) return;

  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
  const publicKey = String(window.HPT_PUSH_CONFIG?.publicKey || '').trim();
  const setStatus = (text, kind = '') => {
    status.textContent = text;
    status.className = 'hptAdminPushStatus' + (kind ? ` ${kind}` : '');
  };
  const setButton = (enabled, busy = false) => {
    button.disabled = busy;
    button.textContent = busy ? 'PLEASE WAIT…' : (enabled ? '🔕 DISABLE MOBILE NOTIFICATIONS' : '🔔 ENABLE MOBILE NOTIFICATIONS');
  };
  const toApplicationServerKey = value => {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  };
  async function getAdminUser() {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) throw new Error('Please sign in to the provider admin account first.');
    const { data, error: adminError } = await sb.from('admin_users').select('id').eq('id', user.id).eq('active', true).maybeSingle();
    if (adminError || !data) throw new Error('This account is not an active provider administrator.');
    return user;
  }
  async function getRegistration() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      throw new Error('This browser does not support push notifications. Use Chrome on Android, or install this website on an iPhone/iPad Home Screen.');
    }
    const registration = await navigator.serviceWorker.register('/hpt-admin-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  }
  async function syncButton() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setButton(false);
        setStatus('This browser does not support Web Push notifications.');
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      setButton(!!subscription);
      if (subscription && Notification.permission === 'granted') setStatus('Notifications are enabled on this device.', 'isOn');
      else if (Notification.permission === 'denied') setStatus('Notifications are blocked in this browser. Allow them in browser/site settings.', 'isError');
      else setStatus('Notifications are not enabled on this device.');
    } catch (error) {
      setButton(false);
      setStatus(error.message || 'Could not check notification status.', 'isError');
    }
  }
  async function enableNotifications(user, grantedPermission) {
    if (!publicKey || publicKey.includes('PASTE_')) {
      throw new Error('Push setup is not complete yet. Add the VAPID public key to hpt-admin-push-config.js and set the matching private key in Supabase Edge Function secrets.');
    }
    if (!window.isSecureContext) throw new Error('Push notifications require the secure https website.');
    const registration = await getRegistration();
    const permission = grantedPermission || Notification.permission;
    if (permission !== 'granted') throw new Error('Notification permission was not granted. Please allow notifications for this website.');

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(publicKey)
      });
    }
    const { error } = await sb.from('hpt_admin_push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription: subscription.toJSON(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'endpoint' });
    if (error) {
      try { await subscription.unsubscribe(); } catch (_) { /* keep the database error visible */ }
      throw new Error(error.message || 'Could not save this device subscription. Run SQL migration 28 first.');
    }
    setButton(true);
    setStatus('Notifications are enabled on this device. New school registrations will alert you here.', 'isOn');
  }
  async function disableNotifications() {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    if (subscription) {
      const { error } = await sb.from('hpt_admin_push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      if (error) throw error;
      await subscription.unsubscribe();
    }
    setButton(false);
    setStatus('Notifications have been disabled on this device.');
  }

  button.addEventListener('click', async () => {
    setButton(false, true);
    // Ask for permission immediately within the tap gesture; some mobile browsers
    // expire the user-activation window after network/service-worker awaits.
    let permissionRequest = null;
    if (publicKey && !publicKey.includes('PASTE_') && 'Notification' in window && Notification.permission === 'default') {
      try { permissionRequest = Notification.requestPermission(); } catch (_) { /* permission status is checked below */ }
    }
    try {
      const user = await getAdminUser();
      const registration = await navigator.serviceWorker.getRegistration('/');
      const existing = registration ? await registration.pushManager.getSubscription() : null;
      if (existing) {
        if (!window.confirm('Disable HPT new-registration notifications on this device?')) {
          await syncButton();
          return;
        }
        await disableNotifications();
      } else {
        const grantedPermission = permissionRequest ? await permissionRequest : Notification.permission;
        await enableNotifications(user, grantedPermission);
      }
    } catch (error) {
      setStatus(error.message || 'Could not update notification settings.', 'isError');
      await syncButton();
    } finally {
      let subscription = null;
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration('/');
          subscription = registration ? await registration.pushManager.getSubscription() : null;
        }
      } catch (_) { /* button state remains disabled if the browser check fails */ }
      setButton(!!subscription);
    }
  });

  syncButton();
})();
