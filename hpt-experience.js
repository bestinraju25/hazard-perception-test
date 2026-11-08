/* HPT Premium Intro + School Welcome Experience
   Uses the current HPT Supabase project and the public-safe top-ten RPC.
   Does not alter exam scoring, candidate records, admin or school-manager flows.
*/
(() => {
  'use strict';

  const CFG = window.RAJU_HPT_CONFIG || {};
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const monthText = new Intl.DateTimeFormat('en-IN', { month:'long', year:'numeric', timeZone:'Asia/Kolkata' }).format(new Date());
  const monthTextCaps = monthText.toUpperCase();
  let leaderboardRows = [];
  let leaderboardFailed = false;
  let finished = false;
  let timers = [];
  let frame = 0;

  function supabaseClient() {
    if (window._sb) return window._sb;
    if (!window.supabase?.createClient || !CFG.supabaseUrl || !CFG.supabaseAnonKey) throw new Error('Supabase client is not available.');
    window._sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    return window._sb;
  }

  async function fetchLeaderboard() {
    try {
      const { data, error } = await supabaseClient().rpc('hpt_global_monthly_top_ten');
      if (error) throw error;
      leaderboardRows = (Array.isArray(data) ? data : []).filter(row =>
        row && typeof row.display_name === 'string' && typeof row.school_name === 'string' &&
        Number.isFinite(Number(row.total_score))
      ).slice(0, 10);
    } catch (error) {
      leaderboardFailed = true;
      console.warn('[HPT intro] Global monthly leaderboard could not be loaded:', error?.message || error);
    }
    paintLeaderboard();
  }

  function emptyMessage() {
    return leaderboardFailed
      ? 'Monthly results are temporarily unavailable.'
      : 'No completed tests have been recorded this month yet.';
  }

  function championMarkup() {
    const first = leaderboardRows[0];
    if (!first) return `<div class="hpt-empty-state"><span class="hpt-empty-icon">✦</span><strong>THE MONTH IS STILL UNFOLDING</strong><p>${escapeHTML(emptyMessage())}</p></div>`;
    return `<div class="hpt-champion-card">
      <div class="hpt-champion-medal"><img src="assets/icon-trophy.svg" alt="" aria-hidden="true"></div>
      <div class="hpt-champion-details">
        <div class="hpt-winner-kicker">THIS MONTH'S LEADING STUDENT</div>
        <div class="hpt-winner-name">${escapeHTML(first.display_name)}</div>
        <div class="hpt-winner-school"><img src="assets/icon-school.svg" alt="" aria-hidden="true"><span>${escapeHTML(first.school_name)}</span></div>
        <div class="hpt-winner-score"><strong>${Number(first.total_score)}</strong><span>/ 100</span></div>
      </div>
    </div>`;
  }

  function topTenMarkup() {
    if (!leaderboardRows.length) return `<tr><td colspan="4" class="hpt-table-empty">${escapeHTML(emptyMessage())}</td></tr>`;
    return leaderboardRows.map((row, index) => `
      <tr class="hpt-leader-row hpt-rank-${index + 1}" style="--row-delay:${index * 55}ms">
        <td class="hpt-rank-cell"><span class="hpt-rank-number">${index + 1}</span></td>
        <td class="hpt-student-cell">${escapeHTML(row.display_name)}</td>
        <td class="hpt-school-cell">${escapeHTML(row.school_name)}</td>
        <td class="hpt-score-cell"><strong>${Number(row.total_score)}</strong><small>/100</small></td>
      </tr>`).join('');
  }

  function paintLeaderboard() {
    const month = $('hptIntroMonthChampion');
    const monthTop = $('hptIntroMonthTopTen');
    if (month) month.textContent = monthTextCaps;
    if (monthTop) monthTop.textContent = monthTextCaps;
    const champ = $('hptChampionLiveData');
    const rows = $('hptTopTenLiveRows');
    if (champ) champ.innerHTML = championMarkup();
    if (rows) rows.innerHTML = topTenMarkup();
  }

  function showScene(sceneName) {
    const root = $('hptIntroRoot');
    if (!root) return;
    root.querySelectorAll('[data-hpt-scene]').forEach(scene => {
      const active = scene.dataset.hptScene === sceneName;
      scene.classList.toggle('is-active', active);
      scene.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
  }

  function schedule(callback, delay) {
    const id = window.setTimeout(() => { if (!finished) callback(); }, delay);
    timers.push(id);
  }

  function animateProgress(duration) {
    const fill = $('hptIntroProgressFill');
    const percent = $('hptIntroProgressPercent');
    if (frame) cancelAnimationFrame(frame);
    const start = performance.now();
    const step = now => {
      if (finished) return;
      const progress = Math.min(100, Math.round(((now - start) / duration) * 100));
      if (fill) fill.style.width = `${progress}%`;
      if (percent) percent.textContent = String(progress);
      if (progress < 100) frame = requestAnimationFrame(step);
    };
    if (reducedMotion) {
      if (fill) fill.style.width = '100%';
      if (percent) percent.textContent = '100';
    } else frame = requestAnimationFrame(step);
  }

  function finishIntro() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    if (frame) cancelAnimationFrame(frame);
    const root = $('hptIntroRoot');
    if (root) {
      root.classList.add('hpt-intro-leaving');
      window.setTimeout(() => { root.hidden = true; }, reducedMotion ? 0 : 520);
    }
    document.documentElement.classList.remove('hpt-intro-pending');
    document.body.classList.remove('hpt-intro-running');
  }

  function startIntro() {
    const root = $('hptIntroRoot');
    if (!root) {
      document.documentElement.classList.remove('hpt-intro-pending');
      return;
    }
    document.body.classList.add('hpt-intro-running');
    root.hidden = false;
    root.querySelectorAll('[data-hpt-skip]').forEach(button => button.addEventListener('click', finishIntro, { once:true }));
    paintLeaderboard();

    const loadingMs = reducedMotion ? 450 : 2050;
    const championMs = reducedMotion ? 600 : 2750;
    const topTenMs = reducedMotion ? 750 : 4200;
    showScene('loading');
    animateProgress(loadingMs);
    schedule(() => showScene('champion'), loadingMs);
    schedule(() => showScene('topten'), loadingMs + championMs);
    schedule(finishIntro, loadingMs + championMs + topTenMs);
  }

  function showSchoolWelcome(school) {
    return new Promise(resolve => {
      const overlay = $('hptSchoolWelcome');
      if (!overlay) { resolve(); return; }
      const name = String(school?.school_name || 'Your Driving School');
      const location = String(school?.location || school?.state || '');
      const title = $('hptWelcomeSchoolName');
      const place = $('hptWelcomeSchoolLocation');
      const logo = $('hptWelcomeSchoolLogo');
      const progress = $('hptWelcomeProgressFill');
      const percent = $('hptWelcomePercent');
      const state = $('hptWelcomeState');
      if (title) title.textContent = name;
      if (place) place.textContent = location;
      if (logo) {
        logo.hidden = true;
        logo.removeAttribute('src');
        if (school?.logo_url) {
          logo.onload = () => { logo.hidden = false; };
          logo.onerror = () => { logo.hidden = true; };
          logo.src = String(school.logo_url);
        }
      }
      if (progress) progress.style.width = '0%';
      if (percent) percent.textContent = '0';
      if (state) state.textContent = 'ACCESS VERIFIED';
      overlay.hidden = false;
      overlay.classList.remove('is-leaving');
      // Fullscreen request is still initiated by the user's login click in app.js.
      const duration = reducedMotion ? 500 : 1550;
      const begin = performance.now();
      const animate = now => {
        const p = Math.min(100, Math.round(((now - begin) / duration) * 100));
        if (progress) progress.style.width = `${p}%`;
        if (percent) percent.textContent = String(p);
        if (p < 100) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      window.setTimeout(() => {
        overlay.classList.add('is-leaving');
        window.setTimeout(() => { overlay.hidden = true; overlay.classList.remove('is-leaving'); resolve(); }, reducedMotion ? 0 : 380);
      }, duration + 100);
    });
  }

  function init() {
    const skip = $('hptIntroSkip');
    if (skip) skip.addEventListener('click', finishIntro);
    // Load the real monthly leaderboard in parallel with the loading scene.
    fetchLeaderboard();
    startIntro();
    // A defensive recovery prevents a missing/blocked script from hiding the website forever.
    window.setTimeout(() => {
      if (document.documentElement.classList.contains('hpt-intro-pending')) finishIntro();
    }, 16000);
  }

  window.HPTExperience = { showSchoolWelcome, finishIntro, refreshLeaderboard: fetchLeaderboard };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
