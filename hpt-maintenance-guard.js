/* HPT Global Maintenance Guard
   Public pages only. Admin control centre intentionally does not load this file.
   Fails open if Supabase is unreachable or the migration has not yet been applied. */
(() => {
  'use strict';
  const config = window.RAJU_HPT_CONFIG;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return;

  const root = document.documentElement;
  const DEFAULT_TITLE = 'We’ll be back soon!';
  const DEFAULT_MESSAGE = 'Our server is currently under maintenance. We are making a few improvements and will be back shortly. Thank you for your patience.';
  let maintenanceScreen = null;
  let lastEnabled = false;
  let checking = false;

  const style = document.createElement('style');
  style.textContent = `
    html.hpt-maintenance-checking body { visibility: hidden !important; }
    html.hpt-maintenance-checking::after {
      content: 'CHECKING HPT SERVICE AVAILABILITY…'; position: fixed; inset: 0; z-index: 2147483647;
      display: grid; place-items: center; padding: 24px; background: #061521; color: #a8bdca;
      font: 800 10px/1.5 Inter, system-ui, sans-serif; letter-spacing: .16em; text-align: center;
    }
    body.hpt-site-maintenance-locked { margin: 0 !important; min-height: 100vh; overflow: hidden !important; background: #061521 !important; }
    body.hpt-site-maintenance-locked > :not(#hpt-maintenance-screen) { display: none !important; }
    #hpt-maintenance-screen {
      position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center;
      width: 100vw; min-height: 100vh; min-height: 100dvh; overflow: auto; box-sizing: border-box;
      padding: max(28px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom));
      color: #eef5f9; text-align: center; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(24,90,122,.35), transparent 48%),
        radial-gradient(ellipse at 85% 90%, rgba(255,193,7,.08), transparent 40%),
        linear-gradient(155deg, #071a29 0%, #06131e 55%, #030a10 100%);
    }
    #hpt-maintenance-screen * { box-sizing: border-box; }
    #hpt-maintenance-screen .hpt-maintenance-card {
      position: relative; width: min(100%, 680px); padding: clamp(26px, 5vw, 54px) clamp(20px, 5vw, 52px);
      border: 1px solid rgba(135,174,195,.25); border-radius: 26px;
      background: linear-gradient(145deg, rgba(14,39,55,.91), rgba(5,18,28,.94));
      box-shadow: 0 30px 90px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.04);
    }
    #hpt-maintenance-screen .hpt-maintenance-roadline {
      width: 84px; height: 4px; margin: 0 auto 24px; border-radius: 10px;
      background: linear-gradient(90deg, #13b7ee, #ffd02d); box-shadow: 0 0 24px rgba(19,183,238,.25);
    }
    #hpt-maintenance-screen .hpt-maintenance-logo { width: 84px; height: 58px; object-fit: contain; margin: 0 auto 18px; display: block; }
    #hpt-maintenance-screen .hpt-maintenance-eyebrow { color: #e8c75a; font-size: 10px; font-weight: 900; letter-spacing: .27em; text-transform: uppercase; }
    #hpt-maintenance-screen .hpt-maintenance-state {
      display: inline-flex; align-items: center; gap: 8px; margin: 22px 0 14px; padding: 8px 12px;
      border: 1px solid rgba(255,191,52,.32); border-radius: 999px; background: rgba(255,191,52,.08);
      color: #ffd46b; font-size: 9px; font-weight: 900; letter-spacing: .16em;
    }
    #hpt-maintenance-screen .hpt-maintenance-dot { width: 7px; height: 7px; border-radius: 50%; background: #ffc83d; box-shadow: 0 0 12px #ffc83d; animation: hptMaintenancePulse 1.7s ease-in-out infinite; }
    #hpt-maintenance-screen h1 { margin: 7px 0 15px; color: #fff; font-size: clamp(30px, 6vw, 50px); line-height: 1.08; font-weight: 900; letter-spacing: -.035em; }
    #hpt-maintenance-screen .hpt-maintenance-message { max-width: 510px; margin: 0 auto; color: #c2d2dc; font-size: clamp(14px, 2.2vw, 17px); line-height: 1.75; font-weight: 500; white-space: pre-wrap; overflow-wrap: anywhere; }
    #hpt-maintenance-screen .hpt-maintenance-foot { margin: 28px 0 0; color: #7893a4; font-size: 10px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
    #hpt-maintenance-screen .hpt-maintenance-refresh { margin-top: 26px; min-height: 46px; padding: 0 22px; border: 1px solid rgba(255,205,55,.55); border-radius: 12px; background: #ffc629; color: #08131b; font: 900 11px/1 Inter, system-ui, sans-serif; letter-spacing: .1em; cursor: pointer; }
    #hpt-maintenance-screen .hpt-maintenance-refresh:hover { background: #ffda63; }
    @keyframes hptMaintenancePulse { 50% { opacity: .35; transform: scale(.78); } }
    @media (prefers-reduced-motion: reduce) { #hpt-maintenance-screen .hpt-maintenance-dot { animation: none; } }
    @media (max-width: 480px) { #hpt-maintenance-screen .hpt-maintenance-card { border-radius: 19px; } #hpt-maintenance-screen .hpt-maintenance-logo { width: 72px; height: 50px; } }
  `;
  (document.head || root).appendChild(style);

  root.classList.add('hpt-maintenance-checking');
  function finishInitialCheck() {
    root.classList.remove('hpt-maintenance-checking');
  }

  async function fetchStatus() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const base = String(config.supabaseUrl).replace(/\/+$/, '');
      const url = `${base}/rest/v1/hpt_site_status?select=maintenance_enabled,maintenance_title,maintenance_message&id=eq.1`;
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error(`Maintenance status returned HTTP ${response.status}`);
      const rows = await response.json();
      return Array.isArray(rows) ? (rows[0] || null) : null;
    } finally {
      clearTimeout(timer);
    }
  }

  function updateScreen(status) {
    if (!maintenanceScreen) return;
    const title = String(status?.maintenance_title || DEFAULT_TITLE).slice(0, 100);
    const message = String(status?.maintenance_message || DEFAULT_MESSAGE).slice(0, 500);
    const titleNode = maintenanceScreen.querySelector('.hpt-maintenance-title');
    const messageNode = maintenanceScreen.querySelector('.hpt-maintenance-message');
    titleNode.textContent = title;
    messageNode.textContent = message;
  }

  function activateMaintenance(status) {
    if (!maintenanceScreen) {
      maintenanceScreen = document.createElement('section');
      maintenanceScreen.id = 'hpt-maintenance-screen';
      maintenanceScreen.setAttribute('role', 'dialog');
      maintenanceScreen.setAttribute('aria-modal', 'true');
      maintenanceScreen.setAttribute('aria-labelledby', 'hpt-maintenance-title');
      const card = document.createElement('div');
      card.className = 'hpt-maintenance-card';
      const road = document.createElement('div'); road.className = 'hpt-maintenance-roadline';
      const logo = document.createElement('img'); logo.className = 'hpt-maintenance-logo'; logo.src = 'assets/hpt-brand-logo-v129.png'; logo.alt = 'HPT';
      const eyebrow = document.createElement('div'); eyebrow.className = 'hpt-maintenance-eyebrow'; eyebrow.textContent = 'DIGITAL ROAD SAFETY LEARNING';
      const state = document.createElement('div'); state.className = 'hpt-maintenance-state';
      const dot = document.createElement('span'); dot.className = 'hpt-maintenance-dot'; state.append(dot, document.createTextNode('SYSTEM MAINTENANCE IN PROGRESS'));
      const title = document.createElement('h1'); title.id = 'hpt-maintenance-title'; title.className = 'hpt-maintenance-title';
      const message = document.createElement('p'); message.className = 'hpt-maintenance-message';
      const foot = document.createElement('p'); foot.className = 'hpt-maintenance-foot'; foot.textContent = 'Thank you for your patience';
      const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'hpt-maintenance-refresh'; refresh.textContent = 'CHECK AGAIN';
      refresh.addEventListener('click', () => location.reload());
      card.append(road, logo, eyebrow, state, title, message, foot, refresh);
      maintenanceScreen.appendChild(card);
      document.body.appendChild(maintenanceScreen);
      for (const child of Array.from(document.body.children)) {
        if (child !== maintenanceScreen && child instanceof HTMLElement) {
          child.inert = true;
          child.setAttribute('aria-hidden', 'true');
        }
      }
      document.body.classList.add('hpt-site-maintenance-locked');
    }
    updateScreen(status);
    lastEnabled = true;
  }

  async function checkMaintenance(isInitial = false) {
    if (checking) return;
    checking = true;
    try {
      const status = await fetchStatus();
      const enabled = !!status?.maintenance_enabled;
      if (enabled) {
        finishInitialCheck();
        activateMaintenance(status);
      } else if (lastEnabled) {
        // A visitor who was locked out is sent through a fresh page load after Admin disables maintenance.
        location.reload();
      } else {
        finishInitialCheck();
      }
    } catch (error) {
      if (isInitial) finishInitialCheck(); // fail open, so a temporary Supabase outage does not blank the public site
      if (!lastEnabled) console.warn('[HPT maintenance] Status check unavailable; public site remains available.', error);
    } finally {
      checking = false;
    }
  }

  checkMaintenance(true);
  // Existing open tabs are locked within at most 30 seconds after the Admin switch is enabled.
  window.setInterval(() => checkMaintenance(false), 30000);
})();
