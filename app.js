// XR Lab Board app logic (moved from index.html)
// Runs after DOM is parsed via defer attribute on this script.
(function () {
  'use strict';
  // Shared state used by multiple functions
  let currentSettings = null;
  const SETTINGS_STORAGE_KEY = 'vibeBoardSettings';
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const defaultLabHours = {
    Monday: { closed: true, start: '09:00', end: '17:00' },
    Tuesday: { closed: false, start: '09:00', end: '16:00' },
    Wednesday: { closed: false, start: '09:00', end: '16:00' },
    Thursday: { closed: true, start: '09:00', end: '17:00' },
    Friday: { closed: false, start: '09:00', end: '14:30' },
  };

  function cloneLabHours(source = defaultLabHours) {
    const hours = {};
    DAY_ORDER.forEach((day) => {
      const fallback = defaultLabHours[day];
      const raw = source?.[day] || fallback;
      hours[day] = {
        closed: raw?.closed ?? fallback.closed,
        start: raw?.start || fallback.start,
        end: raw?.end || fallback.end,
      };
    });
    return hours;
  }

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
    labHours: cloneLabHours(),
  };

  const GAME_SHOWCASE_ROTATE_MS = 7000;
  const gameShowcaseItems = [
    {
      title: 'First Steps',
      category: 'Starter Experience',
      level: 'Best First Try',
      badge: 'Start Here',
      subtitle: 'Hands-on intro to Quest controls',
      description: 'The best place to start for brand-new VR users. It builds comfort with hand presence, grabbing, aiming, and moving before jumping into faster experiences.',
      skills: ['Confidence Building', 'Tech Fluency', 'Curiosity'],
      image: 'assets/games/first-steps.jpg',
      background: 'linear-gradient(135deg, #1c4f63 0%, #2d7aa0 44%, #10232d 100%)',
    },
    {
      title: 'Among Us 3D',
      category: 'Social Deduction',
      level: 'Group Play',
      badge: 'Featured Pick',
      subtitle: 'Read the room and make your case',
      description: 'A strong pick for speaking up, reading the room, defending ideas, and making decisions when the pressure rises.',
      skills: ['Communication', 'Collaboration', 'Critical Thinking'],
      image: 'assets/games/among-us-vr.jpg',
      background: 'linear-gradient(135deg, #31203b 0%, #5a2e6f 42%, #182032 100%)',
    },
    {
      title: 'Beat Saber',
      category: 'Rhythm Game',
      level: 'Quick Start',
      badge: 'Crowd Favorite',
      subtitle: 'Timing, focus, and quick feedback',
      description: 'Easy to jump into and great for building focus, timing, and steady improvement through practice.',
      skills: ['Focus', 'Persistence', 'Self-Management'],
      image: 'assets/games/beat-saber.jpg',
      background: 'linear-gradient(135deg, #12354d 0%, #275778 45%, #0d1621 100%)',
    },
    {
      title: 'Gorilla Tag',
      category: 'Movement Game',
      level: 'Active Play',
      badge: 'High Energy',
      subtitle: 'Fast movement and playful teamwork',
      description: 'Encourages adaptation, spatial awareness, and teamwork in a high-energy setting that gets people moving fast.',
      skills: ['Adaptability', 'Coordination', 'Teamwork'],
      image: 'assets/games/gorilla-tag.jpg',
      background: 'linear-gradient(135deg, #234126 0%, #406a36 40%, #15231a 100%)',
    },
    {
      title: 'Blaston',
      category: 'Competitive Strategy',
      level: '1v1 Challenge',
      badge: 'Quick Decisions',
      subtitle: 'Plan, react, and adjust',
      description: 'Fast one-on-one play that rewards planning, resilience, and learning from each round.',
      skills: ['Strategy', 'Resilience', 'Decision-Making'],
      image: 'assets/games/blaston.jpg',
      background: 'linear-gradient(135deg, #4b2320 0%, #81403a 42%, #211616 100%)',
    },
    {
      title: 'Wander',
      category: 'Exploration App',
      level: 'Travel and Discovery',
      badge: 'Explore',
      subtitle: 'Visit places around the world',
      description: 'A great option for curiosity, place-based learning, and guided discussion as students explore real-world locations in an immersive format.',
      skills: ['Curiosity', 'Observation', 'Discussion'],
      image: 'assets/games/wander.jpg',
      background: 'linear-gradient(135deg, #214d57 0%, #3e8090 42%, #17252b 100%)',
    },
    {
      title: 'Open Brush',
      category: 'Creative App',
      level: 'Make and Design',
      badge: 'Create',
      subtitle: 'Paint and sketch in 3D space',
      description: 'A strong creative tool for experimenting, prototyping ideas, and thinking visually in an immersive environment.',
      skills: ['Creativity', 'Design Thinking', 'Experimentation'],
      image: 'assets/games/open-brush.jpg',
      background: 'linear-gradient(135deg, #412860 0%, #7750ae 42%, #1e1d32 100%)',
    },
    {
      title: 'Cubism',
      category: 'Puzzle Game',
      level: 'Calm Challenge',
      badge: 'Think',
      subtitle: 'Rotate, fit, and solve in 3D',
      description: 'A thoughtful puzzle game that is great for spatial reasoning, patience, and working through a problem one move at a time.',
      skills: ['Spatial Reasoning', 'Problem Solving', 'Patience'],
      image: 'assets/games/cubism.jpg',
      background: 'linear-gradient(135deg, #2a3d61 0%, #4c6ba1 42%, #1a2130 100%)',
    },
    {
      title: 'Hand Physics Lab',
      category: 'Interaction Demo',
      level: 'Hands-On Play',
      badge: 'Hands First',
      subtitle: 'Experiment with hand tracking',
      description: 'A fun way to explore hand tracking and object interaction while building comfort, curiosity, and confidence with natural VR input.',
      skills: ['Tech Fluency', 'Experimentation', 'Curiosity'],
      image: 'assets/games/hand-physics-lab.jpg',
      background: 'linear-gradient(135deg, #3b2b24 0%, #715042 42%, #1d1f29 100%)',
    },
    {
      title: 'Bait!',
      category: 'Relaxed Experience',
      level: 'Low Motion',
      badge: 'Calm Option',
      subtitle: 'A slower-paced VR choice',
      description: 'Still useful as a calmer option for people who want a slower pace while getting used to the headset.',
      skills: ['Patience', 'Observation', 'Comfort Building'],
      image: 'assets/games/bait.jpg',
      background: 'linear-gradient(135deg, #174558 0%, #29839b 42%, #11232c 100%)',
    },
    {
      title: 'Immersive Experiences',
      category: 'XR Content',
      level: 'Beyond Games',
      badge: 'Also Available',
      subtitle: 'Demos, tours, and interactive media',
      description: 'Not everything on the headset has to be a game. Immersive content can support curiosity, reflection, and exploration in a lower-pressure format.',
      skills: ['Curiosity', 'Observation', 'Reflection'],
      background: 'linear-gradient(135deg, #402750 0%, #6b4f9d 42%, #191d2d 100%)',
    },
  ];

  function normalizeSettings(raw = {}) {
    return {
      ...defaultSettings,
      ...raw,
      slides: { ...defaultSettings.slides, ...(raw.slides || {}) },
      labHours: cloneLabHours(raw.labHours),
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return normalizeSettings();
      const parsed = JSON.parse(raw);
      return normalizeSettings(parsed);
    } catch (_) {
      return normalizeSettings();
    }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(s)));
    requestPersistentStorage();
  }

  async function requestPersistentStorage() {
    try {
      const storage = navigator.storage;
      if (!storage?.persisted || !storage?.persist) return false;
      const alreadyPersistent = await storage.persisted();
      if (alreadyPersistent) return true;
      return await storage.persist();
    } catch (_) {
      return false;
    }
  }

  function buildSettingsBackup() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: normalizeSettings(currentSettings || loadSettings()),
    };
  }

  function downloadSettingsBackup() {
    const payload = JSON.stringify(buildSettingsBackup(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `xr-lab-vibes-settings-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function readImportedSettings(rawText) {
    const parsed = JSON.parse(rawText);
    const candidate = parsed?.settings && typeof parsed.settings === 'object' ? parsed.settings : parsed;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('That file does not contain valid board settings.');
    }
    return normalizeSettings(candidate);
  }

  async function importSettingsFile(file) {
    if (!file) return;
    const text = await file.text();
    const settings = readImportedSettings(text);
    saveSettings(settings);
    applySettings(settings);
    openAdmin();
  }

  function applySettings(s) {
    currentSettings = normalizeSettings(s);
    s = currentSettings;
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
    buildHours();
    buildHoursSummary();
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

  function getDaySessions(day, hours = currentSettings?.labHours || defaultSettings.labHours) {
    const entry = hours?.[day];
    if (!entry || entry.closed || !entry.start || !entry.end) return null;
    return [[entry.start, entry.end]];
  }

  function dayInputKey(day) {
    return day.toLowerCase();
  }

  function syncHoursEditorRow(day) {
    const key = dayInputKey(day);
    const closed = document.getElementById(`hours-${key}-closed`);
    const open = document.getElementById(`hours-${key}-open`);
    const close = document.getElementById(`hours-${key}-close`);
    if (!closed || !open || !close) return;
    const disabled = closed.checked;
    open.disabled = disabled;
    close.disabled = disabled;
    open.classList.toggle('opacity-50', disabled);
    close.classList.toggle('opacity-50', disabled);
    open.classList.toggle('cursor-not-allowed', disabled);
    close.classList.toggle('cursor-not-allowed', disabled);
  }

  function populateHoursEditor(hours) {
    DAY_ORDER.forEach((day) => {
      const key = dayInputKey(day);
      const entry = hours?.[day] || defaultLabHours[day];
      const closed = document.getElementById(`hours-${key}-closed`);
      const open = document.getElementById(`hours-${key}-open`);
      const close = document.getElementById(`hours-${key}-close`);
      if (!closed || !open || !close) return;
      closed.checked = !!entry.closed;
      open.value = entry.start || defaultLabHours[day].start;
      close.value = entry.end || defaultLabHours[day].end;
      syncHoursEditorRow(day);
    });
  }

  function readHoursEditor() {
    const hours = {};
    for (const day of DAY_ORDER) {
      const key = dayInputKey(day);
      const closed = document.getElementById(`hours-${key}-closed`);
      const open = document.getElementById(`hours-${key}-open`);
      const close = document.getElementById(`hours-${key}-close`);
      if (!closed || !open || !close) continue;
      const start = open.value || defaultLabHours[day].start;
      const end = close.value || defaultLabHours[day].end;
      if (!closed.checked && start >= end) {
        throw new Error(`${day}: close time must be later than open time.`);
      }
      hours[day] = {
        closed: closed.checked,
        start,
        end,
      };
    }
    return cloneLabHours(hours);
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
  let wheelInit = false;
  let featuredGameIndex = 0;
  let gamesRotateTimer = null;
  let gamesAnimationTimer = null;
  let suppressTapUntil = 0;
  let wheelDelta = 0;
  let wheelResetTimer = null;

  const SWIPE_THRESHOLD_PX = 60;
  const TAP_MAX_TRAVEL_PX = 18;
  const TAP_MAX_DURATION_MS = 350;
  const TAP_SUPPRESS_MS = 400;
  const TAP_SIDE_ZONE_RATIO = 0.2;
  const TAP_SIDE_ZONE_MIN_PX = 120;
  const WHEEL_NAV_THRESHOLD = 90;
  const WHEEL_NAV_COOLDOWN_MS = 450;

  // Slides now rely on CSS safe areas rather than JS scaling.
  let globalScale = 1;
  const initialFeaturedGameIndex = gameShowcaseItems.length
    ? Math.floor(Math.random() * gameShowcaseItems.length)
    : 0;

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

  function getGamesShowcaseNodes() {
    const slide = document.querySelector('[data-slide="games"]');
    if (!slide) return null;
    return {
      slide,
      feature: document.getElementById('games-feature'),
      media: document.getElementById('games-feature-media'),
      image: document.getElementById('games-feature-img'),
      badge: document.getElementById('games-feature-badge'),
      artTitle: document.getElementById('games-feature-art-title'),
      artSubtitle: document.getElementById('games-feature-art-subtitle'),
      category: document.getElementById('games-feature-category'),
      level: document.getElementById('games-feature-level'),
      title: document.getElementById('games-feature-title'),
      description: document.getElementById('games-feature-description'),
      skills: document.getElementById('games-feature-skills'),
      roster: document.getElementById('games-roster'),
    };
  }

  function clearGamesRotation() {
    if (gamesRotateTimer) {
      clearInterval(gamesRotateTimer);
      gamesRotateTimer = null;
    }
  }

  function isGamesSlideActive() {
    return enabledKeys[currentIndex] === 'games';
  }

  function animateFeaturedGame(nodes) {
    if (!nodes?.feature) return;
    nodes.feature.classList.remove('is-swapping');
    // Force restart so repeated updates still animate.
    void nodes.feature.offsetWidth;
    nodes.feature.classList.add('is-swapping');
    if (gamesAnimationTimer) clearTimeout(gamesAnimationTimer);
    gamesAnimationTimer = setTimeout(() => {
      nodes.feature?.classList.remove('is-swapping');
      gamesAnimationTimer = null;
    }, 450);
  }

  function renderGamesRoster(nodes) {
    if (!nodes?.roster) return;
    nodes.roster.innerHTML = '';
    gameShowcaseItems.forEach((item, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'games-roster-item' + (idx === featuredGameIndex ? ' is-active' : '');
      button.setAttribute('aria-label', `Show ${item.title}`);

      const title = document.createElement('span');
      title.className = 'games-roster-title';
      title.textContent = item.title;

      const meta = document.createElement('span');
      meta.className = 'games-roster-meta';
      meta.textContent = `${item.category} · ${item.level}`;

      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener('click', () => {
        renderGamesShowcase(idx, true);
      });

      nodes.roster.appendChild(button);
    });
  }

  function renderGamesShowcase(index, restartRotation = false) {
    if (!gameShowcaseItems.length) return;
    const nodes = getGamesShowcaseNodes();
    if (!nodes?.slide) return;

    featuredGameIndex = ((index % gameShowcaseItems.length) + gameShowcaseItems.length) % gameShowcaseItems.length;
    const item = gameShowcaseItems[featuredGameIndex];

    if (nodes.media) {
      nodes.media.style.background = item.background;
      nodes.media.setAttribute('aria-label', `${item.title} featured recommendation`);
      nodes.media.dataset.fit = item.imageFit || 'cover';
    }
    if (nodes.image) {
      if (item.image) {
        nodes.image.src = item.image;
        nodes.image.alt = `${item.title} artwork`;
        nodes.image.classList.remove('hidden');
      } else {
        nodes.image.src = '';
        nodes.image.alt = '';
        nodes.image.classList.add('hidden');
      }
    }
    if (nodes.badge) nodes.badge.textContent = item.badge;
    if (nodes.artTitle) nodes.artTitle.textContent = item.title;
    if (nodes.artSubtitle) nodes.artSubtitle.textContent = item.subtitle;
    if (nodes.category) nodes.category.textContent = item.category;
    if (nodes.level) nodes.level.textContent = item.level;
    if (nodes.title) nodes.title.textContent = item.title;
    if (nodes.description) nodes.description.textContent = item.description;
    if (nodes.skills) {
      nodes.skills.innerHTML = '';
      item.skills.forEach((skill) => {
        const chip = document.createElement('span');
        chip.className = 'game-skill';
        chip.textContent = skill;
        nodes.skills.appendChild(chip);
      });
    }

    renderGamesRoster(nodes);
    animateFeaturedGame(nodes);

    if (restartRotation && isGamesSlideActive()) {
      startGamesRotation();
    }
  }

  function startGamesRotation() {
    clearGamesRotation();
    if (!isGamesSlideActive() || gameShowcaseItems.length < 2) return;
    gamesRotateTimer = setInterval(() => {
      renderGamesShowcase(featuredGameIndex + 1);
    }, GAME_SHOWCASE_ROTATE_MS);
  }

  function syncGamesShowcase() {
    if (!document.querySelector('[data-slide="games"]')) return;
    renderGamesShowcase(featuredGameIndex);
    if (isGamesSlideActive()) startGamesRotation();
    else clearGamesRotation();
  }

  featuredGameIndex = initialFeaturedGameIndex;

  function showSlideByIndex(i) {
    if (enabledKeys.length === 0) return;
    currentIndex = ((i % enabledKeys.length) + enabledKeys.length) % enabledKeys.length;
    const activeKey = enabledKeys[currentIndex];
    slideOrder.forEach(({ key, el }) => {
      el.classList.toggle('hidden', key !== activeKey);
    });
    renderDots();
    syncGamesShowcase();
    // Keep global scale consistent across slides
    // (computed once from the largest slide)
  }

  function nextSlide() { showSlideByIndex(currentIndex + 1); }
  function prevSlide() { showSlideByIndex(currentIndex - 1); }

  function resetRotationAfterManualNav() {
    const s = loadSettings();
    if (s.rotateEnabled) startRotation(s.rotateSeconds);
    else clearRotation();
  }

  function navigateSlides(direction) {
    if (direction > 0) nextSlide();
    else prevSlide();
    resetRotationAfterManualNav();
  }

  function isInteractiveNavTarget(target) {
    return Boolean(target?.closest('button, a, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]'));
  }

  function getScrollableAncestor(target) {
    let node = target instanceof Element ? target : null;
    while (node && node !== slidesRoot) {
      const styles = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll)/.test(styles.overflowY) && node.scrollHeight > node.clientHeight + 1;
      if (canScrollY) return node;
      node = node.parentElement;
    }
    return null;
  }

  function shouldKeepNativeWheel(target, delta) {
    const scrollable = getScrollableAncestor(target);
    if (!scrollable) return false;
    const atTop = scrollable.scrollTop <= 0;
    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
    if (delta < 0 && !atTop) return true;
    if (delta > 0 && !atBottom) return true;
    return false;
  }

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
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    slidesRoot.addEventListener('pointerdown', (e) => {
      if (isInteractiveNavTarget(e.target)) return;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      tracking = true;
    });
    slidesRoot.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const elapsed = Date.now() - startTime;
      if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
        suppressTapUntil = Date.now() + TAP_SUPPRESS_MS;
        navigateSlides(dx < 0 ? 1 : -1);
        return;
      }
      const movedLittle = Math.abs(dx) <= TAP_MAX_TRAVEL_PX && Math.abs(dy) <= TAP_MAX_TRAVEL_PX;
      if (elapsed <= TAP_MAX_DURATION_MS && movedLittle) {
        maybeNavigateByTap(e);
      }
    });
    ['pointercancel', 'pointerleave'].forEach((eventName) => {
      slidesRoot.addEventListener(eventName, () => {
        tracking = false;
      });
    });
  }

  function getTapZoneWidth() {
    return Math.max(TAP_SIDE_ZONE_MIN_PX, Math.round(window.innerWidth * TAP_SIDE_ZONE_RATIO));
  }

  function maybeNavigateByTap(event) {
    if (Date.now() < suppressTapUntil) return;
    if (isInteractiveNavTarget(event.target)) return;
    const zoneWidth = getTapZoneWidth();
    if (event.clientX <= zoneWidth) {
      navigateSlides(-1);
    } else if (event.clientX >= window.innerWidth - zoneWidth) {
      navigateSlides(1);
    }
  }

  function setupWheelOnce() {
    if (wheelInit) return;
    wheelInit = true;
    let lastWheelNavAt = 0;

    slidesRoot.addEventListener('wheel', (e) => {
      if (enabledKeys.length < 2) return;
      if (e.ctrlKey) return;

      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!dominantDelta) return;
      if (shouldKeepNativeWheel(e.target, dominantDelta)) return;

      e.preventDefault();

      if (wheelResetTimer) clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => {
        wheelDelta = 0;
        wheelResetTimer = null;
      }, 180);

      if (wheelDelta && Math.sign(wheelDelta) !== Math.sign(dominantDelta)) {
        wheelDelta = 0;
      }
      wheelDelta += dominantDelta;

      const now = Date.now();
      if (now - lastWheelNavAt < WHEEL_NAV_COOLDOWN_MS) return;
      if (Math.abs(wheelDelta) < WHEEL_NAV_THRESHOLD) return;

      navigateSlides(wheelDelta > 0 ? 1 : -1);
      lastWheelNavAt = now;
      wheelDelta = 0;
    }, { passive: false });
  }

  function applyCarouselSettings(s) {
    buildSlideOrder();
    const map = s.slides || {};
    enabledKeys = slideOrder.map(s => s.key).filter(k => map[k] !== false);
    if (enabledKeys.length === 0) enabledKeys = ['status'];
    currentIndex = 0;
    showSlideByIndex(0);
    setupSwipeOnce();
    setupWheelOnce();
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
  DAY_ORDER.forEach((day) => {
    const input = document.getElementById(`hours-${dayInputKey(day)}-closed`);
    if (input) input.addEventListener('change', () => syncHoursEditorRow(day));
  });
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
    const showLeaderboard = document.getElementById('show-leaderboard');
    if (showLeaderboard) showLeaderboard.checked = s.slides?.leaderboard !== false;
    const showFaculty = document.getElementById('show-faculty');
    if (showFaculty) showFaculty.checked = s.slides?.faculty !== false;
    populateHoursEditor(s.labHours);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  function closeAdmin() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  const importSettingsButton = document.getElementById('import-settings');
  const exportSettingsButton = document.getElementById('export-settings');
  const importSettingsInput = document.getElementById('settings-import-file');

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
  if (exportSettingsButton) {
    exportSettingsButton.addEventListener('click', downloadSettingsBackup);
  }
  if (importSettingsButton && importSettingsInput) {
    importSettingsButton.addEventListener('click', () => importSettingsInput.click());
    importSettingsInput.addEventListener('change', async (e) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importSettingsFile(file);
        window.alert('Settings imported successfully.');
      } catch (error) {
        window.alert(error?.message || 'Unable to import settings from that file.');
      } finally {
        input.value = '';
      }
    });
  }
  document.getElementById('save-admin').addEventListener('click', () => {
    const s = loadSettings();
    let editedHours;
    try {
      editedHours = readHoursEditor();
    } catch (error) {
      window.alert(error.message);
      return;
    }
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
    s.labHours = editedHours;
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
      faculty: (document.getElementById('show-faculty')?.checked) ?? true,
    };
    if (!s.slides.status && !s.slides.events && !s.slides.hours && !s.slides.games && !s.slides.leaderboard && !s.slides.promo && !s.slides.memes && !s.slides.faculty) {
      s.slides.status = true; // ensure at least one
    }
    saveSettings(s);
    applySettings(s);
    closeAdmin();
  });

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
    requestPersistentStorage();
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

  function formatSessionsForSign(sessions) {
    if (!sessions || sessions.length === 0) return 'Closed';
    return sessions.map(([start, end]) => `${fmt12h(start)} - ${fmt12h(end)}`).join(' / ');
  }

  function buildHours() {
    const hoursList = document.getElementById('hours-list');
    if (!hoursList) return;
    const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const hours = currentSettings?.labHours || defaultSettings.labHours;
    hoursList.innerHTML = '';
    DAY_ORDER.forEach(day => {
      const row = document.createElement('div');
      const isToday = day === todayName;
      const sessions = getDaySessions(day, hours);
      row.className = 'hours-row';
      if (isToday) row.classList.add('today');
      const dayEl = document.createElement('div');
      dayEl.className = 'hours-day';
      const dayName = document.createElement('span');
      dayName.className = 'hours-day-name';
      dayName.textContent = day;
      dayEl.appendChild(dayName);
      if (isToday) {
        const todayBadge = document.createElement('span');
        todayBadge.className = 'hours-today-badge';
        todayBadge.textContent = 'Today';
        dayEl.appendChild(todayBadge);
      }
      const statusEl = document.createElement('div');
      statusEl.className = 'hours-status';
      const statusBadge = document.createElement('span');
      statusBadge.className = 'hours-status-badge';
      const timeEl = document.createElement('div');
      timeEl.className = 'hours-time';
      if (!sessions) {
        row.classList.add('closed');
        statusBadge.classList.add('closed');
        statusBadge.textContent = isToday ? 'Closed Today' : 'Closed';
        timeEl.textContent = 'No Lab Hours';
      } else {
        timeEl.textContent = formatSessionsForSign(sessions);
        let isOpenNow = false;
        let nextStart = null;
        sessions.forEach(([s, e]) => {
          const [sh, sm] = s.split(':').map(Number);
          const [eh, em] = e.split(':').map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          if (nowMin >= start && nowMin < end) isOpenNow = true;
          if (nowMin < start && !nextStart) nextStart = s;
        });
        if (isToday && isOpenNow) {
          row.classList.add('open-now');
          statusBadge.classList.add('open-now');
          statusBadge.textContent = 'Open Now';
        } else if (isToday && nextStart) {
          row.classList.add('closed-now');
          statusBadge.classList.add('closed');
          statusBadge.textContent = `Opens ${fmt12h(nextStart)}`;
        } else if (isToday) {
          row.classList.add('closed');
          statusBadge.classList.add('closed');
          statusBadge.textContent = 'Closed Today';
        } else {
          statusBadge.classList.add('open');
          statusBadge.textContent = 'Open';
        }
      }
      statusEl.appendChild(statusBadge);
      row.appendChild(dayEl);
      row.appendChild(statusEl);
      row.appendChild(timeEl);
      hoursList.appendChild(row);
    });
  }
  buildHours();

  // Hours summary (Today)
  function minutesSinceMidnight(d) { return d.getHours() * 60 + d.getMinutes(); }
  function buildHoursSummary() {
    const el = document.getElementById('hours-summary-text');
    const summary = document.getElementById('hours-summary');
    if (!el || !summary) return;
    summary.classList.remove('open', 'closed');
    const todayName = new Date().toLocaleDateString(undefined, { weekday: 'long' });
    const sessions = getDaySessions(todayName);
    if (!sessions) {
      summary.classList.add('closed');
      el.textContent = 'Closed Today';
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
      summary.classList.add('open');
      el.textContent = `Open Now - Until ${fmt12h(openNow.end)}`;
    } else if (nextSession) {
      summary.classList.add('closed');
      el.textContent = `Closed - Opens ${fmt12h(nextSession.start)}`;
    } else {
      summary.classList.add('closed');
      el.textContent = 'Closed For Today';
    }
  }
  // buildHoursSummary is called after slides load in the init above

  // Schedule helpers for auto status
  function computeTodayScheduleStatus(now = new Date()) {
    const todayName = now.toLocaleDateString(undefined, { weekday: 'long' });
    const sessions = getDaySessions(todayName);
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
      navigateSlides(1);
    } else if (e.key === 'ArrowLeft') {
      navigateSlides(-1);
    }
  });

  // Refit on window resize/orientation change
  window.addEventListener('resize', computeGlobalScale);
})();
