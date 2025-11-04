// XR Lab Board app logic (moved from index.html)
// Runs after DOM is parsed via defer attribute on this script.
(function () {
  'use strict';
  // Shared state used by multiple functions
  let currentSettings = null;

  // Live Clock (24h or 12h based on locale)
  const clock = document.getElementById('clock');
  function tick() {
    const now = new Date();
    if (clock) clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const heroTime = document.getElementById('hero-time');
    const heroDate = document.getElementById('hero-date');
    if (heroTime) heroTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (heroDate) heroDate.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    // Re-evaluate status and summary on each tick
    updateStatusFromScheduleOrManual();
    buildHoursSummary();
  }
  // Defer initial tick scheduling until after boot/setup

  // Settings state
  const defaultSettings = {
    status: 'OPEN',             // 'OPEN' | 'CLOSED'
    closeTime: '17:00',         // 24h time input value
    title: 'XR Lab',
    subtitle: 'Room E251 · Information Board',
    location: 'E251, East Building',
    refreshMinutes: 10,
    bannerText: '',
    bannerVisible: false,
    rotateEnabled: true,
    rotateSeconds: 30,
    // Default visible slides; disable Events, Promo, Memes by default
    slides: { status: true, events: false, hours: true, games: true, leaderboard: true, promo: false, memes: false, faculty: true },
    autoStatus: true,
    heroImageUrl: 'assets/hero/hero-image.jpg',
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem('vibeBoardSettings');
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    } catch (_) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(s) {
    localStorage.setItem('vibeBoardSettings', JSON.stringify(s));
  }

  function applySettings(s) {
    currentSettings = s;
    // Title + subtitle
    const titleEl = document.getElementById('board-title');
    const subEl = document.getElementById('board-subtitle');
    if (titleEl) titleEl.textContent = s.title;
    if (subEl) subEl.textContent = s.subtitle;
    // Hero image
    const heroImg = document.getElementById('hero-photo');
    if (heroImg && s.heroImageUrl) heroImg.src = s.heroImageUrl;
    // Status + hours (auto/manual)
    updateStatusFromScheduleOrManual();
    // Location
    const loc = document.getElementById('location-line');
    if (loc) loc.textContent = s.location;
    // Banner
    ensureBanner(s);
    // Refresh interval
    const meta = document.getElementById('meta-refresh');
    const mins = Number(s.refreshMinutes) || 0;
    if (meta) meta.setAttribute('content', String(Math.max(0, Math.floor(mins * 60))));
    setAutoReload(mins);
    applyCarouselSettings(s);
  }

  function formatTime(value) {
    // value like '17:00'
    const [h, m] = (value || '').split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return value || '';
  }

  // Banner element management
  function ensureBanner(settings) {
    let banner = document.getElementById('notice-banner');
    if (settings.bannerVisible && settings.bannerText) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'notice-banner';
        banner.className = 'fixed top-0 inset-x-0 z-40 text-center py-2 bg-amber-500 text-black font-semibold shadow';
        document.body.appendChild(banner);
      }
      banner.textContent = settings.bannerText;
    } else if (banner) {
      banner.remove();
    }
  }

  // Auto reload management
  let reloadTimer = null;
  function setAutoReload(minutes) {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
      reloadTimer = null;
    }
    const ms = Math.max(0, (Number(minutes) || 0) * 60 * 1000);
    if (ms > 0) {
      reloadTimer = setTimeout(() => location.reload(), ms);
    }
  }

  // -------- Slides/Carousel (no-scroll screens) --------
  const slidesRoot = document.getElementById('slides');
  const dotsRoot = document.getElementById('slide-dots');
  let slideOrder = [];
  let enabledKeys = [];
  let currentIndex = 0;
  let rotateTimer = null;
  let swipeInit = false;

  // Slides now rely on CSS safe areas rather than JS scaling.
  let globalScale = 1;
  function applyGlobalScale() {
    if (!slidesRoot) return;
    slidesRoot.style.transformOrigin = '';
    slidesRoot.style.transform = '';
  }
  function computeGlobalScale() {
    globalScale = 1;
    applyGlobalScale();
  }

  function buildSlideOrder() {
    slideOrder = Array.from(slidesRoot.querySelectorAll('[data-slide]')).map(el => ({
      key: el.getAttribute('data-slide'),
      el
    }));
  }

  function showSlideByIndex(i) {
    if (enabledKeys.length === 0) return;
    currentIndex = ((i % enabledKeys.length) + enabledKeys.length) % enabledKeys.length;
    const activeKey = enabledKeys[currentIndex];
    slideOrder.forEach(({ key, el }) => {
      el.classList.toggle('hidden', key !== activeKey);
    });
    renderDots();
    // Keep global scale consistent across slides
    // (computed once from the largest slide)
  }

  function nextSlide() { showSlideByIndex(currentIndex + 1); }
  function prevSlide() { showSlideByIndex(currentIndex - 1); }

  function clearRotation() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }
  function startRotation(seconds) {
    clearRotation();
    const sec = Math.max(5, Number(seconds) || 0);
    if (enabledKeys.length > 1) {
      rotateTimer = setInterval(nextSlide, sec * 1000);
    }
  }

  function renderDots() {
    if (!dotsRoot) return;
    dotsRoot.innerHTML = '';
    enabledKeys.forEach((key, idx) => {
      const dot = document.createElement('button');
      dot.className = 'w-2.5 h-2.5 rounded-full ' + (idx === currentIndex ? 'bg-cyan-400' : 'bg-slate-500/70');
      dot.setAttribute('aria-label', key);
      dot.addEventListener('click', () => {
        showSlideByIndex(idx);
        const s = loadSettings();
        if (s.rotateEnabled) startRotation(s.rotateSeconds);
      });
      dotsRoot.appendChild(dot);
    });
  }

  function setupSwipeOnce() {
    if (swipeInit) return;
    swipeInit = true;
    let startX = 0, startY = 0, tracking = false;
    slidesRoot.addEventListener('pointerdown', (e) => {
      startX = e.clientX; startY = e.clientY; tracking = true;
    });
    slidesRoot.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) nextSlide(); else prevSlide();
        const s = loadSettings();
        if (s.rotateEnabled) startRotation(s.rotateSeconds);
      }
    });
  }

  function applyCarouselSettings(s) {
    buildSlideOrder();
    const map = s.slides || {};
    enabledKeys = slideOrder.map(s => s.key).filter(k => map[k] !== false);
    if (enabledKeys.length === 0) enabledKeys = ['status'];
    currentIndex = 0;
    showSlideByIndex(0);
    setupSwipeOnce();
    clearRotation();
    if (s.rotateEnabled) startRotation(s.rotateSeconds);
    // Compute initial global scale from all slides
    setTimeout(computeGlobalScale, 0);
  }

  // Admin modal open via easy gesture on large bottom-center area
  const trigger = document.getElementById('admin-trigger');
  let tapTimes = [];
  let holdTimer = null;
  const tripleTapWindowMs = 1200;
  const longPressMs = 1200;

  function tryOpenOnTripleTap() {
    const now = Date.now();
    tapTimes = tapTimes.filter(t => now - t <= tripleTapWindowMs);
    if (tapTimes.length >= 3) {
      tapTimes = [];
      openAdmin();
    }
  }

  if (trigger) {
    trigger.addEventListener('click', () => {
      tapTimes.push(Date.now());
      tryOpenOnTripleTap();
    });
    trigger.addEventListener('pointerdown', () => {
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        holdTimer = null;
        openAdmin();
      }, longPressMs);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
      trigger.addEventListener(ev, () => {
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
      });
    });
  }

  const modal = document.getElementById('admin-modal');
  function openAdmin() {
    const s = loadSettings();
    document.getElementById('input-title').value = s.title;
    document.getElementById('input-subtitle').value = s.subtitle;
    document.getElementById('input-location').value = s.location;
    document.getElementById('input-close-time').value = s.closeTime;
    document.getElementById('input-refresh').value = s.refreshMinutes;
    document.getElementById('input-banner').value = s.bannerText;
    document.getElementById('toggle-banner').checked = !!s.bannerVisible;
    document.getElementById('toggle-auto-status').checked = !!s.autoStatus;
    const heroUrlEl = document.getElementById('input-hero-url');
    if (heroUrlEl) heroUrlEl.value = s.heroImageUrl || '';
    // rotation + screens
    document.getElementById('toggle-rotate').checked = !!s.rotateEnabled;
    document.getElementById('input-rotate-seconds').value = s.rotateSeconds ?? defaultSettings.rotateSeconds;
    document.getElementById('show-status').checked = s.slides?.status !== false;
    document.getElementById('show-events').checked = s.slides?.events !== false;
    document.getElementById('show-hours').checked = s.slides?.hours !== false;
    const showGames = document.getElementById('show-games');
    if (showGames) showGames.checked = s.slides?.games !== false;
    const showPromo = document.getElementById('show-promo');
    if (showPromo) showPromo.checked = s.slides?.promo !== false;
    const showMemes = document.getElementById('show-memes');
    if (showMemes) showMemes.checked = s.slides?.memes !== false;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  function closeAdmin() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  // Admin controls
  document.getElementById('admin-close').addEventListener('click', closeAdmin);
  document.getElementById('cancel-admin').addEventListener('click', closeAdmin);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAdmin(); });
  document.getElementById('reset-defaults').addEventListener('click', () => {
    const s = { ...defaultSettings };
    saveSettings(s);
    applySettings(s);
  });
  document.getElementById('quick-open').addEventListener('click', () => {
    const s = loadSettings();
    s.status = 'OPEN';
    saveSettings(s);
    applySettings(s);
  });
  document.getElementById('quick-closed').addEventListener('click', () => {
    const s = loadSettings();
    s.status = 'CLOSED';
    saveSettings(s);
    applySettings(s);
  });
  document.getElementById('save-admin').addEventListener('click', () => {
    const s = loadSettings();
    s.title = document.getElementById('input-title').value.trim() || defaultSettings.title;
    s.subtitle = document.getElementById('input-subtitle').value.trim() || defaultSettings.subtitle;
    s.location = document.getElementById('input-location').value.trim() || defaultSettings.location;
    s.closeTime = document.getElementById('input-close-time').value || defaultSettings.closeTime;
    s.refreshMinutes = Math.max(0, parseInt(document.getElementById('input-refresh').value || defaultSettings.refreshMinutes, 10));
    s.bannerText = document.getElementById('input-banner').value;
    s.bannerVisible = document.getElementById('toggle-banner').checked;
    s.autoStatus = document.getElementById('toggle-auto-status').checked;
    const heroUrlEl = document.getElementById('input-hero-url');
    if (heroUrlEl) s.heroImageUrl = heroUrlEl.value.trim();
    // rotation + screens
    s.rotateEnabled = document.getElementById('toggle-rotate').checked;
    s.rotateSeconds = Math.max(5, parseInt(document.getElementById('input-rotate-seconds').value || String(defaultSettings.rotateSeconds), 10));
    s.slides = {
      status: document.getElementById('show-status').checked,
      events: document.getElementById('show-events').checked,
      hours: document.getElementById('show-hours').checked,
      games: (document.getElementById('show-games')?.checked) ?? true,
      leaderboard: document.getElementById('show-leaderboard')?.checked ?? true,
      promo: (document.getElementById('show-promo')?.checked) ?? true,
      memes: (document.getElementById('show-memes')?.checked) ?? true,
      
    };
    if (!s.slides.status && !s.slides.events && !s.slides.hours && !s.slides.games && !s.slides.promo && !s.slides.memes) {
      s.slides.status = true; // ensure at least one
    }
    saveSettings(s);
    applySettings(s);
    closeAdmin();
  });

  // Lab hours data (must be available before tick/buildHoursSummary)
  const labHours = {
    Monday: null,
    Tuesday: [['09:00', '12:30'], ['13:00', '16:00']],
    Wednesday: [['09:00', '12:30'], ['13:00', '16:00']],
    Thursday: null,
    Friday: [['09:00', '12:30'], ['13:00', '14:30']],
  };

  // Load slides from external files then boot app
  async function loadSlides() {
    const placeholders = Array.from(document.querySelectorAll('.slide-placeholder'));
    for (const ph of placeholders) {
      const src = ph.getAttribute('data-src');
      if (!src) continue;
      try {
        const resp = await fetch(src, { cache: 'no-store' });
        const html = await resp.text();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        const node = wrapper.firstElementChild;
        if (node) ph.replaceWith(node);
      } catch (e) {
        console.warn('Failed to load slide', src, e);
      }
    }
  }

  (async () => {
    await loadSlides();
    const boot = loadSettings();
    applySettings(boot);
    buildHours();
    buildHoursSummary();
    // Now start the clock after setup
    tick();
    setInterval(tick, 1000);
    // Ensure hero photo fallback runs after injection
    (function ensureHeroPhoto() {
      const img = document.getElementById('hero-photo');
      if (!img) return;
      const test = new Image();
      test.onload = () => { /* ok */ };
      test.onerror = () => {
        const fallback = img.getAttribute('data-fallback');
        if (fallback) img.src = fallback;
      };
      test.src = img.src;
    })();
  })();

  // Lab hours rendering

  function fmt12h(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function buildHours() {
    const hoursList = document.getElementById('hours-list');
    if (!hoursList) return;
    const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    hoursList.innerHTML = '';
    order.forEach(day => {
      const row = document.createElement('div');
      const isToday = day === todayName;
      const sessions = labHours[day];
      row.className = 'hours-row' + (isToday ? ' today' : '') + (!sessions ? ' closed' : '');
      const dayEl = document.createElement('div');
      dayEl.className = 'hours-day';
      dayEl.textContent = day;
      const slots = document.createElement('div');
      slots.className = 'hours-slots';
      if (!sessions) {
        const closed = document.createElement('span');
        closed.className = 'badge-closed';
        closed.textContent = 'Closed';
        slots.appendChild(closed);
      } else {
        const labels = ['Morning', 'Afternoon'];
        // Determine current time in minutes for "Now" indicator
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        sessions.forEach(([s, e], idx) => {
          const slot = document.createElement('div');
          slot.className = 'slot';
          const lbl = document.createElement('div');
          lbl.className = 'slot-label';
          lbl.textContent = labels[idx] || 'Session';
          const time = document.createElement('div');
          time.className = 'slot-time';
          time.innerHTML = `${fmt12h(s)}&nbsp;&ndash;&nbsp;${fmt12h(e)}`;
          if (isToday) {
            const [sh, sm] = s.split(':').map(Number);
            const [eh, em] = e.split(':').map(Number);
            const start = sh * 60 + sm;
            const end = eh * 60 + em;
            if (nowMin >= start && nowMin < end) {
              slot.classList.add('now');
              const badge = document.createElement('span');
              badge.className = 'slot-badge';
              badge.textContent = 'NOW';
              slot.appendChild(badge);
            }
          }
          slot.appendChild(lbl);
          slot.appendChild(time);
          slots.appendChild(slot);
        });
      }
      row.appendChild(dayEl);
      row.appendChild(slots);
      hoursList.appendChild(row);
    });
  }
  buildHours();

  // Hours summary (Today)
  function minutesSinceMidnight(d) { return d.getHours() * 60 + d.getMinutes(); }
  function buildHoursSummary() {
    const el = document.getElementById('hours-summary-text');
    if (!el) return;
    const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const sessions = labHours[todayName];
    if (!sessions) {
      el.textContent = 'Closed';
      return;
    }
    const now = new Date();
    const nowMin = minutesSinceMidnight(now);
    let openNow = null;
    let nextSession = null;
    for (const [s, e] of sessions) {
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (nowMin >= start && nowMin < end) { openNow = { end: e }; break; }
      if (nowMin < start && !nextSession) nextSession = { start: s, end: e };
    }
    if (openNow) {
      el.textContent = `Open now · until ${fmt12h(openNow.end)}`;
    } else if (nextSession) {
      el.innerHTML = `Closed · next ${fmt12h(nextSession.start)}&ndash;${fmt12h(nextSession.end)}`;
    } else {
      el.textContent = 'Closed for the rest of the day';
    }
  }
  // buildHoursSummary is called after slides load in the init above

  // Schedule helpers for auto status
  function computeTodayScheduleStatus(now = new Date()) {
    const todayName = now.toLocaleDateString(undefined, { weekday: 'long' });
    const sessions = labHours[todayName];
    const nowMin = minutesSinceMidnight(now);
    if (!sessions) return { openNow: false, next: null, until: null };
    let next = null;
    for (const [s, e] of sessions) {
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (nowMin >= start && nowMin < end) return { openNow: true, until: e, next: null };
      if (nowMin < start && !next) next = { start: s, end: e };
    }
    return { openNow: false, next, until: null };
  }

  function setHeroStatus(open) {
    const hero = document.getElementById('hero-status');
    const heroBox = document.getElementById('status-hero');
    const pill = document.getElementById('status-pill');
    const welcome = document.getElementById('welcome-line');
    const kiosk = document.getElementById('kiosk-line');
    if (hero) {
      hero.textContent = open ? 'OPEN' : 'CLOSED';
      hero.classList.remove('drac-open-text', 'drac-closed-text', 'text-white', 'text-black');
      if (open) {
        hero.classList.add('text-black');
      } else {
        hero.classList.add('text-white');
      }
    }
    if (pill) {
      pill.classList.toggle('status-pill-open', open);
      pill.classList.toggle('status-pill-closed', !open);
    }
    if (welcome) welcome.textContent = open ? "Open to all students — come on in, y'all!" : 'We\u2019re closed right now';
    if (kiosk) {
      if (open) {
        kiosk.classList.remove('hidden');
        kiosk.textContent = 'Please check in at the kiosk inside';
      } else {
        // Show a helpful note when closed; hide entirely if you prefer
        kiosk.classList.remove('hidden');
        kiosk.textContent = 'Closed now — please visit during posted hours';
      }
    }
  }

  function updateStatusFromScheduleOrManual() {
    const s = currentSettings || loadSettings();
    const hoursLine = document.getElementById('hours-line');
    if (!hoursLine) return;
    if (s.autoStatus) {
      const st = computeTodayScheduleStatus(new Date());
      if (st.openNow) {
        setHeroStatus(true);
        hoursLine.textContent = `Open now · until ${fmt12h(st.until)}`;
      } else if (st.next) {
        setHeroStatus(false);
        hoursLine.innerHTML = `Closed · next ${fmt12h(st.next.start)}&ndash;${fmt12h(st.next.end)}`;
      } else {
        setHeroStatus(false);
        hoursLine.textContent = 'Closed now — please visit during posted hours';
      }
    } else {
      setHeroStatus(s.status === 'OPEN');
      hoursLine.textContent = s.status === 'OPEN' ? `Open until ${formatTime(s.closeTime)}` : 'Closed now — please visit during posted hours';
    }
  }

  // Keyboard controls (desktop testing): Left/Right to change slides
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const editing = /INPUT|TEXTAREA|SELECT/.test(tag);
    const modalOpen = !modal.classList.contains('hidden');
    if (editing || modalOpen) return;
    if (e.key === 'ArrowRight') {
      nextSlide();
      const s = loadSettings();
      if (s.rotateEnabled) startRotation(s.rotateSeconds);
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
      const s = loadSettings();
      if (s.rotateEnabled) startRotation(s.rotateSeconds);
    }
  });

  // Refit on window resize/orientation change
  window.addEventListener('resize', computeGlobalScale);
})();
