const WIDTH = 1280;
const HEIGHT = 720;

const FALLBACK_LAYOUT = {
  avatar: { x: 1033, y: 157, radius: 77 },
  voiceChart: { x: 140, y: 400, width: 640, height: 260 },
  xpBar: { x: 205, y: 154, width: 475, height: 10, radius: 5, backgroundColor: "rgba(20, 28, 45, 1)", fillColor: "#8ad3f4" },
  xpGroup: { offsetX: 0, offsetY: 0 },
  roleBadges: { x: 100, y: 300, maxWidth: 600, maxHeight: 100, badgeHeight: 28, gap: 8 },
  info: [
    { key: 'xpPercent', x: 104, y: 159, fontSize: 20, fontWeight: '500', color: '#FFFFFF', align: 'left', group: 'xpGroup' },
    { key: 'xpValue', x: 400, y: 220, fontSize: 35, fontWeight: '700', color: '#FFFFFF', align: 'center', group: 'xpGroup' },
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
    { key: 'voiceValue', x: 895, y: 660, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' },
    { key: 'dailyStreakValue', x: 1135, y: 569, fontSize: 26, fontWeight: '600', color: '#FFFFFF', align: 'left' }
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
          xpGroup: data?.xpGroup ?? FALLBACK_LAYOUT.xpGroup,
          roleBadges: data?.roleBadges ?? FALLBACK_LAYOUT.roleBadges,
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
    xpGroup: FALLBACK_LAYOUT.xpGroup,
    roleBadges: FALLBACK_LAYOUT.roleBadges,
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function darkenColor(hex, factor = 0.15) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgba(20, 28, 45, 0.8)';
  const r = Math.floor(rgb.r * factor);
  const g = Math.floor(rgb.g * factor);
  const b = Math.floor(rgb.b * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function cleanRoleName(name) {
  return name
    .replace(/:[a-zA-Z0-9_]+:/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

function drawRoleBadges(ctx, roles, config) {
  if (!roles || roles.length === 0) return;

  ctx.save();
  const { x, y, maxWidth, maxHeight, badgeHeight, gap } = config;
  const fontSize = badgeHeight * 0.55;
  const circleRadius = badgeHeight * 0.25;
  const paddingX = badgeHeight * 0.5;
  const gapBetweenCircleAndText = badgeHeight * 0.35;
  const paddingLeft = paddingX + circleRadius * 2 + gapBetweenCircleAndText;

  let currentX = x;
  let currentY = y;

  roles.forEach(role => {
    const cleanName = cleanRoleName(role.name);
    if (!cleanName) return;

    ctx.font = `500 ${fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    const textMetrics = ctx.measureText(cleanName);
    const badgeWidth = paddingLeft + textMetrics.width + paddingX;

    if (currentX + badgeWidth > x + maxWidth && currentX > x) {
      currentX = x;
      currentY += badgeHeight + gap;
    }

    // Vérifier si on dépasse la hauteur max
    if (currentY + badgeHeight > y + maxHeight) {
      return; // Stop rendering badges
    }

    const roleColor = role.color === '#000000' ? '#99aab5' : role.color;
    const darkBgColor = darkenColor(roleColor, 0.15);

    drawRoundedRect(ctx, currentX, currentY, badgeWidth, badgeHeight, badgeHeight / 2, darkBgColor, 0.9);

    ctx.beginPath();
    ctx.arc(currentX + paddingX + circleRadius, currentY + badgeHeight / 2, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = roleColor;
    ctx.fill();

    const textX = currentX + paddingX + circleRadius * 2 + gapBetweenCircleAndText;
    const textY = currentY + badgeHeight / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `500 ${fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(cleanName, textX, textY);

    currentX += badgeWidth + gap;
  });

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
    case 'dailyStreakValue':
      return `🔥 ${state.dailyStreak ?? 0}`;
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
  const maxWidthInput = document.getElementById('maxWidth');
  const maxHeightInput = document.getElementById('maxHeight');
  const configOutput = document.getElementById('configOutput');

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const infoLayout = Array.isArray(layoutData.info) && layoutData.info.length > 0 ? layoutData.info : FALLBACK_LAYOUT.info;
  const statsLayout = Array.isArray(layoutData.stats) ? layoutData.stats : [];
  const voiceChartConfig = layoutData.voiceChart || FALLBACK_LAYOUT.voiceChart;
  const xpBarConfig = layoutData.xpBar || FALLBACK_LAYOUT.xpBar;
  const roleBadgesConfig = layoutData.roleBadges || FALLBACK_LAYOUT.roleBadges;
  const voiceChartLegend = infoLayout.find(item => item.key === 'voiceChartLegend');
  const voiceChartCenter = voiceChartLegend && voiceChartLegend.align === 'center' ? voiceChartLegend.x : null;

  let avatarSettings = { ...(layoutData.avatar || FALLBACK_LAYOUT.avatar) };
  const DEFAULT_AVATAR_SETTINGS = { ...avatarSettings };

  let xpGroupSettings = { ...(layoutData.xpGroup || FALLBACK_LAYOUT.xpGroup) };
  const DEFAULT_XP_GROUP_SETTINGS = { ...xpGroupSettings };

  let roleBadgesSettings = { ...(layoutData.roleBadges || FALLBACK_LAYOUT.roleBadges) };
  const DEFAULT_ROLE_BADGES_SETTINGS = { ...roleBadgesSettings };

  const BASE_CONFIG = {
    info: [
      {
        key: 'xpGroup',
        label: 'Groupe XP',
        x: 0,
        y: 0,
        fontSize: 0,
        fontWeight: '500',
        color: '#FFFFFF',
        align: 'left',
        getText: () => '',
        isSpecial: true
      },
      {
        key: 'roleBadges',
        label: 'Badges de rôles',
        x: roleBadgesSettings.x,
        y: roleBadgesSettings.y,
        fontSize: 0,
        fontWeight: '500',
        color: '#FFFFFF',
        align: 'left',
        getText: () => '',
        isSpecial: true
      },
      ...infoLayout.map(item => ({
        ...item,
        label: item.key,
        getText: state => resolveText(item.key, state),
        group: item.group || undefined,
      }))
    ],
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
    dailyStreak: 7,
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    backgroundUrl: './template.png',
    voiceHistory: createDefaultVoiceHistory(),
    roles: [
      { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
            { name: '🟡Légende du ridge', color: '#f1c40f' },
      { name: '🟠Scout', color: '#e67e22' },
      { name: '🟣Campeur du dimanche', color: '#9b59b6' },
      { name: '🟢habbo', color: '#2ecc71' },
      { name: '🔵test', color: '#3498db' },
      { name: '🔴lslsl', color: '#e74c3c' }
    ]
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

    // Draw XP bar (avec offset du groupe)
    const xpPercent = (state.xpCurrent / state.xpNeeded) || 0;
    const adjustedXpBarConfig = {
      ...xpBarConfig,
      x: xpBarConfig.x + xpGroupSettings.offsetX,
      y: xpBarConfig.y + xpGroupSettings.offsetY
    };
    drawProgressBar(ctx, adjustedXpBarConfig, xpPercent);

    // Draw role badges
    if (state.roles && state.roles.length > 0) {
      drawRoleBadges(ctx, state.roles, roleBadgesSettings);
    }

    const items = workingConfig[currentView];
    items.forEach(item => {
      // Skip special items (xpGroup, roleBadges)
      if (item.isSpecial) return;

      const stateNow = getCurrentState();
      const text = item.customText ?? item.getText(stateNow);

      // Calculer la position avec le décalage du groupe XP
      let finalX = item.x;
      let finalY = item.y;
      if (item.group === 'xpGroup') {
        finalX += xpGroupSettings.offsetX;
        finalY += xpGroupSettings.offsetY;
      }

      ctx.save();
      ctx.fillStyle = item.color;
      ctx.font = `${item.fontWeight} ${item.fontSize}px Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = item.align;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, finalX, finalY);
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

    if (key === 'xpGroup') {
      textContentInput.value = '[Groupe XP - barre + % + valeur]';
      textContentInput.disabled = true;
      textSizeInput.disabled = true;
      textColorInput.disabled = true;
      textAlignInput.disabled = true;
      textXInput.value = Math.round(xpGroupSettings.offsetX);
      textYInput.value = Math.round(xpGroupSettings.offsetY);
      maxWidthInput.value = '';
      maxWidthInput.disabled = true;
      maxHeightInput.value = '';
      maxHeightInput.disabled = true;
    } else if (key === 'roleBadges') {
      textContentInput.value = '[Badges de rôles - groupe]';
      textContentInput.disabled = true;
      textSizeInput.disabled = true;
      textColorInput.disabled = true;
      textAlignInput.disabled = true;
      textXInput.value = Math.round(item.x);
      textYInput.value = Math.round(item.y);
      maxWidthInput.value = roleBadgesSettings.maxWidth || '';
      maxWidthInput.disabled = false;
      maxHeightInput.value = roleBadgesSettings.maxHeight || '';
      maxHeightInput.disabled = false;
    } else {
      textContentInput.disabled = false;
      textSizeInput.disabled = false;
      textColorInput.disabled = false;
      textAlignInput.disabled = false;
      textContentInput.value = item.customText ?? item.getText(state);
      textSizeInput.value = item.fontSize;
      textColorInput.value = item.color;
      textAlignInput.value = item.align;
      textXInput.value = Math.round(item.x);
      textYInput.value = Math.round(item.y);
      maxWidthInput.value = item.maxWidth || '';
      maxWidthInput.disabled = false;
      maxHeightInput.value = item.maxHeight || '';
      maxHeightInput.disabled = false;
    }
  }

  function updateItemFromInputs() {
    if (!selectedKey) return;
    const item = workingConfig[currentView].find(el => el.key === selectedKey);
    if (!item) return;

    if (selectedKey === 'xpGroup') {
      // Mise à jour spéciale pour xpGroup
      xpGroupSettings.offsetX = Number(textXInput.value) || xpGroupSettings.offsetX;
      xpGroupSettings.offsetY = Number(textYInput.value) || xpGroupSettings.offsetY;
    } else if (selectedKey === 'roleBadges') {
      // Mise à jour spéciale pour roleBadges
      roleBadgesSettings.x = Number(textXInput.value) || roleBadgesSettings.x;
      roleBadgesSettings.y = Number(textYInput.value) || roleBadgesSettings.y;
      const maxWidth = Number(maxWidthInput.value);
      const maxHeight = Number(maxHeightInput.value);
      if (maxWidth > 0) roleBadgesSettings.maxWidth = maxWidth;
      if (maxHeight > 0) roleBadgesSettings.maxHeight = maxHeight;
      item.x = roleBadgesSettings.x;
      item.y = roleBadgesSettings.y;
    } else {
      const state = getCurrentState();
      const defaultText = item.getText(state);
      const content = textContentInput.value;
      item.customText = content && content !== defaultText ? content : null;
      item.fontSize = Number(textSizeInput.value) || item.fontSize;
      item.color = textColorInput.value || item.color;
      item.align = textAlignInput.value || item.align;
      item.x = Number(textXInput.value) || item.x;
      item.y = Number(textYInput.value) || item.y;
      const maxWidth = Number(maxWidthInput.value);
      const maxHeight = Number(maxHeightInput.value);
      if (maxWidth > 0) item.maxWidth = maxWidth;
      else delete item.maxWidth;
      if (maxHeight > 0) item.maxHeight = maxHeight;
      else delete item.maxHeight;
    }

    renderCanvas();
    updateExport();
  }

  function updateExport() {
    const exportData = {
      avatar: { ...avatarSettings },
      voiceChart: { ...voiceChartConfig },
      xpBar: { ...xpBarConfig },
      xpGroup: { ...xpGroupSettings },
      roleBadges: { ...roleBadgesSettings },
      info: workingConfig.info.filter(item => !item.isSpecial).map(({ key, x, y, fontSize, fontWeight, color, align, customText, group, maxWidth, maxHeight }) => {
        const obj = { key, x, y, fontSize, fontWeight, color, align };
        if (customText) obj.customText = customText;
        if (group) obj.group = group;
        if (maxWidth) obj.maxWidth = maxWidth;
        if (maxHeight) obj.maxHeight = maxHeight;
        return obj;
      }),
      stats: workingConfig.stats.filter(item => !item.isSpecial).map(({ key, x, y, fontSize, fontWeight, color, align, customText, group, maxWidth, maxHeight }) => {
        const obj = { key, x, y, fontSize, fontWeight, color, align };
        if (customText) obj.customText = customText;
        if (group) obj.group = group;
        if (maxWidth) obj.maxWidth = maxWidth;
        if (maxHeight) obj.maxHeight = maxHeight;
        return obj;
      }),
    };
    configOutput.value = JSON.stringify(exportData, null, 2);
  }

  function resetConfig() {
    workingConfig.info = deepCloneConfig(BASE_CONFIG.info);
    workingConfig.stats = deepCloneConfig(BASE_CONFIG.stats);
    avatarSettings = { ...DEFAULT_AVATAR_SETTINGS };
    xpGroupSettings = { ...DEFAULT_XP_GROUP_SETTINGS };
    roleBadgesSettings = { ...DEFAULT_ROLE_BADGES_SETTINGS };
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
    const step = event.shiftKey ? 5 : 1;
    let updated = false;

    if (selectedKey === 'xpGroup') {
      switch (event.key) {
        case 'ArrowUp':
          xpGroupSettings.offsetY -= step;
          updated = true;
          break;
        case 'ArrowDown':
          xpGroupSettings.offsetY += step;
          updated = true;
          break;
        case 'ArrowLeft':
          xpGroupSettings.offsetX -= step;
          updated = true;
          break;
        case 'ArrowRight':
          xpGroupSettings.offsetX += step;
          updated = true;
          break;
      }
      if (updated) {
        textXInput.value = Math.round(xpGroupSettings.offsetX);
        textYInput.value = Math.round(xpGroupSettings.offsetY);
        renderCanvas();
        updateExport();
      }
      return;
    }

    const item = workingConfig[currentView].find(el => el.key === selectedKey);
    if (!item) return;

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
      if (selectedKey === 'roleBadges') {
        roleBadgesSettings.x = item.x;
        roleBadgesSettings.y = item.y;
      }
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
  maxWidthInput.addEventListener('input', updateItemFromInputs);
  maxHeightInput.addEventListener('input', updateItemFromInputs);

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
  maxWidthInput.addEventListener('keydown', stopPropagation);
  maxHeightInput.addEventListener('keydown', stopPropagation);

  render(defaultState.view);
  syncAvatarInputs();
}
