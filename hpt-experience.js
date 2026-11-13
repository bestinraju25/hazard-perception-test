/* HPT cinematic opening + school welcome.
   One continuous progress animation; the live monthly podium is hydrated by app.js. */
(() => {
  'use strict';
  const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  let finished = false;
  let animationFrame = 0;
  let finishTimer = 0;
  let welcomeFrame = 0;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[char]));
  }

  function renderIntroPodium(rows, unavailable = false) {
    const host = $('hptIntroPodium');
    const month = $('hptIntroPodiumMonth');
    if (!host) return;
    if (month) {
      month.textContent = new Intl.DateTimeFormat('en-IN', {
        month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
      }).format(new Date());
    }
    if (unavailable) {
      host.innerHTML = `<div class="hpt-podium-empty"><strong>THE PODIUM IS WAITING.</strong><span>Complete your test and take your shot at the Global Top 5.</span></div>`;
      return;
    }
    const leaders = Array.isArray(rows) ? rows.slice(0, 3) : [];
    if (!leaders.length) {
      host.innerHTML = `<div class="hpt-podium-empty"><strong>THE PODIUM IS OPEN.</strong><span>Your name could be here. Complete an HPT this month and join the leaders.</span></div>`;
      return;
    }
    const visualOrder = [
      { row: leaders[1], rank: 2, medal: '🥈' },
      { row: leaders[0], rank: 1, medal: '🥇' },
      { row: leaders[2], rank: 3, medal: '🥉' }
    ].filter(item => item.row);
    host.innerHTML = visualOrder.map(({row, rank, medal}) => {
      const score = Math.max(0, Math.min(100, Number(row.total_score) || 0));
      return `<article class="hpt-podium-card hpt-podium-rank-${rank}" style="--podium-order:${rank===2?1:rank===1?2:3}">
        <div class="hpt-podium-rankline"><span class="hpt-podium-medal">${medal}</span><span class="hpt-podium-ranklabel">${rank===1?'1ST PLACE':rank===2?'2ND PLACE':'3RD PLACE'}</span></div>
        <strong class="hpt-podium-student">${escapeHTML(row.display_name || 'Student')}</strong>
        <span class="hpt-podium-school" title="${escapeHTML(row.school_name || '')}">${escapeHTML(row.school_name || 'Participating school')}</span>
        <span class="hpt-podium-score">${score}<small>/100</small></span>
      </article>`;
    }).join('');
  }

  function finishIntro() {
    if (finished) return;
    finished = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (finishTimer) clearTimeout(finishTimer);
    const root = $('hptIntroRoot');
    if (root) {
      root.classList.add('hpt-intro-leaving');
      window.setTimeout(() => { root.hidden = true; }, reducedMotion ? 0 : 420);
    }
    document.documentElement.classList.remove('hpt-intro-pending');
    document.body.classList.remove('hpt-intro-running');
  }

  function animateProgress(duration) {
    const fill = $('hptIntroProgressFill');
    const percent = $('hptIntroProgressPercent');
    const status = $('hptIntroStatus');
    const start = performance.now();
    const step = now => {
      if (finished) return;
      const progress = Math.min(100, Math.round(((now - start) / duration) * 100));
      if (fill) fill.style.width = `${progress}%`;
      if (percent) percent.textContent = String(progress);
      if (status) {
        if (progress < 34) status.textContent = 'Preparing your HPT experience';
        else if (progress < 76) status.textContent = 'Setting this month’s podium';
        else status.textContent = 'Opening school access';
      }
      if (progress < 100) animationFrame = requestAnimationFrame(step);
      else finishIntro();
    };
    if (reducedMotion) {
      if (fill) fill.style.width = '100%';
      if (percent) percent.textContent = '100';
      finishTimer = window.setTimeout(finishIntro, 650);
    } else {
      animationFrame = requestAnimationFrame(step);
    }
  }

  function startIntro() {
    const root = $('hptIntroRoot');
    if (!root) {
      document.documentElement.classList.remove('hpt-intro-pending');
      return;
    }
    document.body.classList.add('hpt-intro-running');
    root.hidden = false;
    root.querySelectorAll('[data-hpt-skip]').forEach(button => {
      button.addEventListener('click', finishIntro, { once: true });
    });
    const fill = $('hptIntroProgressFill');
    const percent = $('hptIntroProgressPercent');
    if (fill) fill.style.width = '0%';
    if (percent) percent.textContent = '0';
    // A slightly longer, smooth intro gives visitors time to see the real podium.
    // The Top 5 fetch runs in parallel; the animation never waits indefinitely for Supabase.
    animateProgress(reducedMotion ? 650 : 3900);
    finishTimer = window.setTimeout(finishIntro, reducedMotion ? 1400 : 6200);
  }

  function showSchoolWelcome(school) {
    return new Promise(resolve => {
      const overlay = $('hptSchoolWelcome');
      if (!overlay) { resolve(); return; }
      const title = $('hptWelcomeSchoolName');
      const place = $('hptWelcomeSchoolLocation');
      const logo = $('hptWelcomeSchoolLogo');
      const progress = $('hptWelcomeProgressFill');
      const percent = $('hptWelcomePercent');
      const state = $('hptWelcomeState');
      if (title) title.textContent = String(school?.school_name || 'Your Driving School');
      if (place) place.textContent = String(school?.location || school?.state || '');
      if (logo) {
        const platformLogo = 'assets/hpt-brand-logo-v129.png';
        logo.hidden = false;
        logo.onload = () => { logo.hidden = false; };
        logo.onerror = () => {
          if (logo.dataset.platformFallback !== '1') {
            logo.dataset.platformFallback = '1';
            logo.src = platformLogo;
          } else {
            logo.hidden = true;
          }
        };
        logo.dataset.platformFallback = school?.logo_url ? '0' : '1';
        logo.src = String(school?.logo_url || platformLogo);
      }
      if (progress) progress.style.width = '0%';
      if (percent) percent.textContent = '0';
      if (state) state.textContent = 'ACCESS VERIFIED';
      overlay.hidden = false;
      overlay.classList.remove('is-leaving');
      const duration = reducedMotion ? 500 : 1550;
      const begin = performance.now();
      const animate = now => {
        const value = Math.min(100, Math.round(((now - begin) / duration) * 100));
        if (progress) progress.style.width = `${value}%`;
        if (percent) percent.textContent = String(value);
        if (value < 100) welcomeFrame = requestAnimationFrame(animate);
      };
      welcomeFrame = requestAnimationFrame(animate);
      window.setTimeout(() => {
        overlay.classList.add('is-leaving');
        window.setTimeout(() => {
          overlay.hidden = true;
          overlay.classList.remove('is-leaving');
          if (welcomeFrame) cancelAnimationFrame(welcomeFrame);
          resolve();
        }, reducedMotion ? 0 : 380);
      }, duration + 100);
    });
  }

  function init() {
    window.HPTExperience = {
      showSchoolWelcome,
      finishIntro,
      renderIntroPodium,
      refreshLeaderboard: () => window.HPTLeaderboardReady || Promise.resolve()
    };
    // Handle both timings: the RPC may resolve before or after this script starts.
    if (Array.isArray(window.HPTGlobalTopFive)) renderIntroPodium(window.HPTGlobalTopFive);
    else if (window.HPTLeaderboardReady?.then) {
      window.HPTLeaderboardReady.then(() => renderIntroPodium(window.HPTGlobalTopFive || [], !!window.HPTLeaderboardUnavailable))
        .catch(() => renderIntroPodium(null, true));
    }
    startIntro();
    window.setTimeout(() => {
      if (document.documentElement.classList.contains('hpt-intro-pending')) finishIntro();
    }, 9000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
