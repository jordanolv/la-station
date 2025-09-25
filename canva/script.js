const WIDTH = 1280;
const HEIGHT = 720;

const FALLBACK_LAYOUT = {
  avatar: { x: 1033, y: 157, radius: 77 },
  voiceChart: { x: 140, y: 400, width: 640, height: 260 },
  xpBar: { x: 205, y: 154, width: 475, height: 10, radius: 5, backgroundColor: "rgba(20, 28, 45, 1)", fillColor: "#8ad3f4" },
  info: [
    { key: 'xpPercent', x: 104, y: 159, fontSize: 20, fontWeight: '500', color: '#FFFFFF', align: 'left' },
    { key: 'xpValue', x: 400, y: 220, fontSize: 35, fontWeight: '700', color: '#FFFFFF', align: 'center' },
    { key: 'username', x: 1033, y: 54, fontSize: 22, fontWeight: '400', color: '#FFFFFF', align: 'center' },
    { key: 'bio', x: 1033, y: 259, fontSize: 20, fontWeight: '400', color: '#FFFFFF', align: 'center' },
    { key: 'joinedTimeline', x: 260, y: 420, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'voiceChartLegend', x: 400, y: 680, fontSize: 22, fontWeight: '500', color: '#FFFFFF', align: 'center' },
    { key: 'lastActiveTimeline', x: 260, y: 470, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'ridgecoinValue', x: 895, y: 365, fontSize: 26, fontWeight: '700', color: '#FFFFFF', align: 'left' },
    { key: 'levelValue', x: 1135, y: 365, fontSize: 26, fontWeight: '700', color: '#FFFFFF', align: 'left' },
    { key: 'birthdayValue', x: 895, y: 455, fontSize: 19, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'joinedValue', x: 1135, y: 455, fontSize: 19, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'messagesValue', x: 895, y: 569, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'voiceValue', x: 895, y: 660, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' }
  ],
  stats: []
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadImageSafe(url) {
  if (!url) return null;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

async function loadLayout() {
  const sources = [
    '../src/features/user/services/profileCard.layout.json',
    'layout.json',
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        return {
          avatar: data?.avatar ?? FALLBACK_LAYOUT.avatar,
          voiceChart: data?.voiceChart ?? FALLBACK_LAYOUT.voiceChart,
          xpBar: data?.xpBar ?? FALLBACK_LAYOUT.xpBar,
          info: Array.isArray(data?.info) && data.info.length > 0 ? data.info : FALLBACK_LAYOUT.info,
          stats: Array.isArray(data?.stats) ? data.stats : FALLBACK_LAYOUT.stats,
        };
      }
    } catch {
      // ignore and try next source
    }
  }

  return {
    avatar: FALLBACK_LAYOUT.avatar,
    voiceChart: FALLBACK_LAYOUT.voiceChart,
    xpBar: FALLBACK_LAYOUT.xpBar,
    info: FALLBACK_LAYOUT.info,
    stats: FALLBACK_LAYOUT.stats
  };
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 1) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  if (minutes >= 1) {
    const restSec = Math.floor(seconds % 60);
    return restSec > 0 ? `${minutes}m ${restSec}s` : `${minutes}m`;
  }
  return `${Math.floor(seconds)}s`;
}

function computeVoiceDailyTotals(history = []) {
  const daysCount = 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  const weekday = startOfWeek.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const totals = [];
  for (let i = 0; i < daysCount; i += 1) {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const seconds = history.reduce((sum, entry) => {
      if (!entry) return sum;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return sum;
      if (entryDate >= dayStart && entryDate < dayEnd) {
        const time = typeof entry.time === 'number' ? entry.time : 0;
        return sum + time;
      }
      return sum;
    }, 0);

    const label = dayStart
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();

    totals.push({ label, seconds });
  }

  return totals;
}

function drawRoundedRect(ctx, x, y, width, height, radius, color, opacity = 1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawProgressBar(ctx, config, percent) {
  if (!config) return;
  const { x, y, width, height, radius, backgroundColor, fillColor } = config;
  const clampedPercent = Math.max(0, Math.min(1, percent));

  // Draw background
  drawRoundedRect(ctx, x, y, width, height, radius, backgroundColor, 1);

  // Draw fill
  if (clampedPercent > 0) {
    drawRoundedRect(ctx, x, y, width * clampedPercent, height, radius, fillColor, 1);
  }
}

function renderVoiceChart(ctx, config, totals, centerX) {
  if (!config) return;
  const { x, y, width, height } = config;
  ctx.save();
  const offset = centerX != null ? centerX - (x + width / 2) : 0;
  const containerX = x + offset;
  // ctx.fillStyle = 'rgba(12, 18, 31, 0.65)';
  // ctx.fillRect(containerX, y, width, height);

  const maxSeconds = Math.max(...totals.map(t => t.seconds), 0);

  if (maxSeconds === 0) {
    const offset = centerX != null ? centerX - (x + width / 2) : 0;
    ctx.fillStyle = 'rgba(200, 214, 255, 0.75)';
    ctx.font = '500 22px "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Aucune activité vocale récente', x + width / 2 + offset, y + height / 2);
    ctx.restore();
    return;
  }

  const paddingTop = 30;
  const paddingBottom = 40;
  const usableHeight = height - paddingBottom - paddingTop;

  let gapBetween = Math.min(40, width * 0.06);
  let barWidth = (width - gapBetween * (totals.length - 1)) / totals.length;
  if (barWidth > 70) {
    barWidth = 70;
    gapBetween = (width - barWidth * totals.length) / Math.max(totals.length - 1, 1);
  } else if (barWidth < 28) {
    barWidth = 28;
    gapBetween = Math.max(12, (width - barWidth * totals.length) / Math.max(totals.length - 1, 1));
  }

  const totalWidth = barWidth * totals.length + gapBetween * Math.max(totals.length - 1, 0);
  const desiredCenter = centerX ?? (containerX + width / 2);
  let startX = desiredCenter - totalWidth / 2;
  startX = Math.max(containerX, Math.min(startX, containerX + width - totalWidth));

  totals.forEach((item, index) => {
    const barHeight = (item.seconds / maxSeconds) * usableHeight;
    const barX = startX + index * (barWidth + gapBetween);
    const barY = y + paddingTop + (usableHeight - barHeight);

    const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    gradient.addColorStop(0, '#8ad3f4');
    gradient.addColorStop(1, '#7fc1df');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 18px "Montserrat", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, barX + barWidth / 2, y + height - paddingBottom / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 18px "Montserrat", "Segoe UI", sans-serif';
    ctx.fillText(formatDuration(item.seconds), barX + barWidth / 2, barY - 14);
  });

  ctx.restore();
}

function createDefaultVoiceHistory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  const weekday = startOfWeek.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const sampleSeconds = [900, 2400, 0, 1800, 3600, 1200, 2100];
  return sampleSeconds.map((seconds, index) => ({
    date: new Date(startOfWeek.getTime() + index * 86400000).toISOString(),
    time: seconds,
  }));
}

function resolveText(key, state) {
  switch (key) {
    case 'xpPercent':
      return `${Math.round((state.xpCurrent / state.xpNeeded) * 100)}%`;
    case 'xpValue':
      return `${state.xpCurrent}/${state.xpNeeded} XP`;
    case 'username':
      return state.username;
    case 'bio':
      return state.bio;
    case 'voiceChartLegend':
      return `Dernière activité : ${state.lastActive ?? state.joinedAt}`;
    case 'joinedTimeline':
    case 'lastActiveTimeline':
      return '';
    case 'joinedValue':
      return state.joinedAt;
    case 'ridgecoinValue':
    case 'coinsValue':
      return state.money.toLocaleString('fr-FR');
    case 'levelValue':
      return String(state.level);
    case 'birthdayValue':
      return state.birthday;
    case 'messagesValue':
      return state.messages.toLocaleString('fr-FR');
    case 'voiceValue':
    case 'totalVoiceValue':
      return formatDuration(state.voiceTotal);
    case 'sevenVoiceValue':
      return formatDuration(state.voice7);
    default:
      return state[key] ?? '';
  }
}

function deepCloneConfig(list) {
  return list.map(item => ({ ...item }));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

loadLayout().then(setupPlayground);

function setupPlayground(layoutData) {
  const canvas = document.getElementById('card');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const backgroundInput = document.getElementById('backgroundUrl');
  const avatarInput = document.getElementById('avatarUrl');
  const avatarXInput = document.getElementById('avatarX');
  const avatarYInput = document.getElementById('avatarY');
  const avatarRadiusInput = document.getElementById('avatarRadius');
  const rerenderBtn = document.getElementById('rerender');
  const downloadBtn = document.getElementById('downloadPng');
  const copyJsonBtn = document.getElementById('copyJson');
  const resetBtn = document.getElementById('resetPositions');
  const buttons = Array.from(document.querySelectorAll('nav button'));

  const textSelect = document.getElementById('textSelect');
  const textContentInput = document.getElementById('textContent');
  const textSizeInput = document.getElementById('textSize');
  const textColorInput = document.getElementById('textColor');
  const textAlignInput = document.getElementById('textAlign');
  const textXInput = document.getElementById('textX');
  const textYInput = document.getElementById('textY');
  const configOutput = document.getElementById('configOutput');

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const infoLayout = Array.isArray(layoutData.info) && layoutData.info.length > 0 ? layoutData.info : FALLBACK_LAYOUT.info;
  const statsLayout = Array.isArray(layoutData.stats) ? layoutData.stats : [];
  const voiceChartConfig = layoutData.voiceChart || FALLBACK_LAYOUT.voiceChart;
  const xpBarConfig = layoutData.xpBar || FALLBACK_LAYOUT.xpBar;
  const voiceChartLegend = infoLayout.find(item => item.key === 'voiceChartLegend');
  const voiceChartCenter = voiceChartLegend && voiceChartLegend.align === 'center' ? voiceChartLegend.x : null;

  let avatarSettings = { ...(layoutData.avatar || FALLBACK_LAYOUT.avatar) };
  const DEFAULT_AVATAR_SETTINGS = { ...avatarSettings };

  const BASE_CONFIG = {
    info: infoLayout.map(item => ({
      ...item,
      label: item.key,
      getText: state => resolveText(item.key, state),
    })),
    stats: statsLayout.map(item => ({
      ...item,
      label: item.key,
      getText: state => resolveText(item.key, state),
    })),
  };

  const workingConfig = {
    info: deepCloneConfig(BASE_CONFIG.info),
    stats: deepCloneConfig(BASE_CONFIG.stats),
  };

  const defaultState = {
    view: 'info',
    username: 'Jordz',
    guildName: 'The Ridge',
    level: 32,
    xpCurrent: 750,
    xpNeeded: 1000,
    money: 12450,
    birthday: '15/08/1995',
    joinedAt: '12/01/2023',
    lastActive: '23/09/2025',
    bio: 'Toujours prêt pour la prochaine session.',
    messages: 1245,
    voiceTotal: 32 * 3600 + 45 * 60,
    voice7: 6 * 3600,
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    backgroundUrl: './template.png',
    voiceHistory: createDefaultVoiceHistory()
  };

  backgroundInput.value = defaultState.backgroundUrl;
  avatarInput.value = defaultState.avatarUrl;
  if (avatarXInput && avatarYInput && avatarRadiusInput) {
    avatarXInput.value = String(DEFAULT_AVATAR_SETTINGS.x);
    avatarYInput.value = String(DEFAULT_AVATAR_SETTINGS.y);
    avatarRadiusInput.value = String(DEFAULT_AVATAR_SETTINGS.radius);
  }

  let currentView = defaultState.view;
  let selectedKey = null;

  function getCurrentState() {
    return {
      ...defaultState,
      backgroundUrl: backgroundInput.value || defaultState.backgroundUrl,
      avatarUrl: avatarInput.value || defaultState.avatarUrl,
      avatarX: avatarSettings.x,
      avatarY: avatarSettings.y,
      avatarRadius: avatarSettings.radius,
      voiceHistory: defaultState.voiceHistory,
    };
  }

  async function renderCanvas() {
    const state = getCurrentState();
    const [bgImage, avatar] = await Promise.all([
      loadImageSafe(state.backgroundUrl),
      loadImageSafe(state.avatarUrl)
    ]);

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, WIDTH, HEIGHT);
    }

    if (avatar) {
      const size = avatarSettings.radius * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarSettings.x, avatarSettings.y, avatarSettings.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarSettings.x - avatarSettings.radius, avatarSettings.y - avatarSettings.radius, size, size);
      ctx.restore();
    }

    const dailyTotals = computeVoiceDailyTotals(state.voiceHistory);
    renderVoiceChart(ctx, voiceChartConfig, dailyTotals, voiceChartCenter);

    // Draw XP bar
    const xpPercent = (state.xpCurrent / state.xpNeeded) || 0;
    drawProgressBar(ctx, xpBarConfig, xpPercent);

    const items = workingConfig[currentView];
    items.forEach(item => {
      const stateNow = getCurrentState();
      const text = item.customText ?? item.getText(stateNow);
      ctx.save();
      ctx.fillStyle = item.color;
      ctx.font = `${item.fontWeight} ${item.fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = item.align;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, item.x, item.y);
      ctx.restore();
    });
  }

  function populateTextSelect() {
    textSelect.innerHTML = '';
    workingConfig[currentView].forEach(item => {
      const option = document.createElement('option');
      option.value = item.key;
      option.textContent = item.label;
      textSelect.appendChild(option);
    });
    if (workingConfig[currentView].length > 0) {
      const firstKey = selectedKey || workingConfig[currentView][0].key;
      selectItem(firstKey);
    }
  }

  function selectItem(key) {
    selectedKey = key;
    const item = workingConfig[currentView].find(el => el.key === key);
    if (!item) return;
    const state = getCurrentState();
    textSelect.value = key;
    textContentInput.value = item.customText ?? item.getText(state);
    textSizeInput.value = item.fontSize;
    textColorInput.value = item.color;
    textAlignInput.value = item.align;
    textXInput.value = Math.round(item.x);
    textYInput.value = Math.round(item.y);
  }

  function updateItemFromInputs() {
    if (!selectedKey) return;
    const item = workingConfig[currentView].find(el => el.key === selectedKey);
    if (!item) return;

    const state = getCurrentState();
    const defaultText = item.getText(state);
    const content = textContentInput.value;
    item.customText = content && content !== defaultText ? content : null;
    item.fontSize = Number(textSizeInput.value) || item.fontSize;
    item.color = textColorInput.value || item.color;
    item.align = textAlignInput.value || item.align;
    item.x = Number(textXInput.value) || item.x;
    item.y = Number(textYInput.value) || item.y;

    renderCanvas();
    updateExport();
  }

  function updateExport() {
    const exportData = {
      avatar: { ...avatarSettings },
      voiceChart: { ...voiceChartConfig },
      xpBar: { ...xpBarConfig },
      info: workingConfig.info.map(({ key, x, y, fontSize, fontWeight, color, align, customText }) => ({ key, x, y, fontSize, fontWeight, color, align, customText })),
      stats: workingConfig.stats.map(({ key, x, y, fontSize, fontWeight, color, align, customText }) => ({ key, x, y, fontSize, fontWeight, color, align, customText })),
    };
    configOutput.value = JSON.stringify(exportData, null, 2);
  }

  function resetConfig() {
    workingConfig.info = deepCloneConfig(BASE_CONFIG.info);
    workingConfig.stats = deepCloneConfig(BASE_CONFIG.stats);
    avatarSettings = { ...DEFAULT_AVATAR_SETTINGS };
    syncAvatarInputs();
    render(currentView);
  }

  async function render(view) {
    currentView = view;
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.canvas === view));
    populateTextSelect();
    await renderCanvas();
    updateExport();
  }

  function stopPropagation(event) {
    event.stopPropagation();
  }

  function handleKeyNudge(event) {
    if (!selectedKey) return;
    const item = workingConfig[currentView].find(el => el.key === selectedKey);
    if (!item) return;
    const step = event.shiftKey ? 5 : 1;
    let updated = false;
    switch (event.key) {
      case 'ArrowUp':
        item.y = Math.max(0, item.y - step);
        updated = true;
        break;
      case 'ArrowDown':
        item.y = Math.min(HEIGHT, item.y + step);
        updated = true;
        break;
      case 'ArrowLeft':
        item.x = Math.max(0, item.x - step);
        updated = true;
        break;
      case 'ArrowRight':
        item.x = Math.min(WIDTH, item.x + step);
        updated = true;
        break;
    }
    if (updated) {
      textXInput.value = Math.round(item.x);
      textYInput.value = Math.round(item.y);
      renderCanvas();
      updateExport();
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      await render(btn.dataset.canvas);
    });
  });

  textSelect.addEventListener('change', event => selectItem(event.target.value));
  textContentInput.addEventListener('input', updateItemFromInputs);
  textSizeInput.addEventListener('input', updateItemFromInputs);
  textColorInput.addEventListener('input', updateItemFromInputs);
  textAlignInput.addEventListener('change', updateItemFromInputs);
  textXInput.addEventListener('input', updateItemFromInputs);
  textYInput.addEventListener('input', updateItemFromInputs);

  rerenderBtn.addEventListener('click', () => render(currentView));
  resetBtn.addEventListener('click', resetConfig);
  copyJsonBtn.addEventListener('click', () => {
    updateExport();
    navigator.clipboard.writeText(configOutput.value).then(() => {
      copyJsonBtn.textContent = 'Copié !';
      setTimeout(() => (copyJsonBtn.textContent = 'Copier JSON'), 1500);
    });
  });

  downloadBtn.addEventListener('click', async () => {
    await renderCanvas();
    const link = document.createElement('a');
    link.download = `profile-${currentView}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  backgroundInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') render(currentView);
  });

  avatarInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') render(currentView);
  });

  function syncAvatarInputs() {
    if (!avatarXInput || !avatarYInput || !avatarRadiusInput) return;
    avatarXInput.value = String(Math.round(avatarSettings.x));
    avatarYInput.value = String(Math.round(avatarSettings.y));
    avatarRadiusInput.value = String(Math.round(avatarSettings.radius));
  }

  function handleAvatarInputs() {
    if (!avatarXInput || !avatarYInput || !avatarRadiusInput) return;
    const x = Number(avatarXInput.value);
    const y = Number(avatarYInput.value);
    const radius = Number(avatarRadiusInput.value);

    avatarSettings = {
      x: clamp(Number.isFinite(x) ? x : DEFAULT_AVATAR_SETTINGS.x, 0, WIDTH),
      y: clamp(Number.isFinite(y) ? y : DEFAULT_AVATAR_SETTINGS.y, 0, HEIGHT),
      radius: clamp(Number.isFinite(radius) ? radius : DEFAULT_AVATAR_SETTINGS.radius, 20, Math.min(WIDTH, HEIGHT)),
    };

    syncAvatarInputs();
    renderCanvas();
    updateExport();
  }

  if (avatarXInput && avatarYInput && avatarRadiusInput) {
    avatarXInput.addEventListener('input', handleAvatarInputs);
    avatarYInput.addEventListener('input', handleAvatarInputs);
    avatarRadiusInput.addEventListener('input', handleAvatarInputs);
  }

  window.addEventListener('keydown', handleKeyNudge);
  textXInput.addEventListener('keydown', stopPropagation);
  textYInput.addEventListener('keydown', stopPropagation);
  textSizeInput.addEventListener('keydown', stopPropagation);
  textContentInput.addEventListener('keydown', stopPropagation);
  textColorInput.addEventListener('keydown', stopPropagation);
  textAlignInput.addEventListener('keydown', stopPropagation);

  render(defaultState.view);
  syncAvatarInputs();
}
