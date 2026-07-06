// ============================================
// FOCUS MODE
// ============================================
let focusRunning = false;
let focusInterval = null;
let focusSeconds = 25 * 60;
let focusTotalSeconds = 25 * 60;
let focusMode = 'work';

// Ringtone settings
const RINGTONE_DEFAULTS = { work: 'chime', short: 'bell', long: 'melody', custom: 'melody' };
let ringtoneSettings = JSON.parse(localStorage.getItem('workinghours_ringtones') || 'null') || { ...RINGTONE_DEFAULTS };
let customAudioBuffer = null;
let customAudioName = '';
let ringtoneLoopId = null;
let ringtonePlayingAudio = null;

// Load stored custom audio
(function() {
  const stored = localStorage.getItem('workinghours_custom_ringtone');
  if (stored) {
    try { const o = JSON.parse(stored); customAudioBuffer = o.data; customAudioName = o.name; } catch(e) {}
  }
})();

function applyRingtoneUI() {
  Object.keys(RINGTONE_DEFAULTS).forEach(mode => {
    const sel = document.getElementById('ringtone' + mode.charAt(0).toUpperCase() + mode.slice(1));
    if (sel) sel.value = ringtoneSettings[mode] || RINGTONE_DEFAULTS[mode];
  });
  updateCustomRingtoneUI();
}

function onRingtoneChange(mode) {
  const id = 'ringtone' + mode.charAt(0).toUpperCase() + mode.slice(1);
  const sel = document.getElementById(id);
  if (!sel) return;
  ringtoneSettings[mode] = sel.value;
  localStorage.setItem('workinghours_ringtones', JSON.stringify(ringtoneSettings));
  updateCustomRingtoneUI();
}

function updateCustomRingtoneUI() {
  const hasCustom = Object.values(ringtoneSettings).some(v => v === 'custom');
  const row = document.getElementById('ringtoneCustomFileRow');
  const nameEl = document.getElementById('ringtoneCustomName');
  if (hasCustom) {
    row.style.display = '';
    nameEl.textContent = customAudioName || '未选择文件';
    nameEl.title = customAudioName || '';
  } else {
    row.style.display = 'none';
  }
}

function onCustomFileSelected() {
  const file = document.getElementById('ringtoneCustomFile').files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('文件不能超过 5MB'); return; }
  const reader = new FileReader();
  reader.onload = function() {
    customAudioBuffer = reader.result;
    customAudioName = file.name;
    localStorage.setItem('workinghours_custom_ringtone', JSON.stringify({ data: customAudioBuffer, name: customAudioName }));
    updateCustomRingtoneUI();
  };
  reader.readAsDataURL(file);
}

// === Sound Engine (Web Audio API) ===
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, startTime, duration, type, gain) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain || 0.3, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(startTime); osc.stop(startTime + duration);
}

function playChime() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => playTone(freq, now + i * 0.15, 0.5, 'sine', 0.25));
}

function playBell() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  playTone(880, now, 0.4, 'triangle', 0.35);
  playTone(880, now + 0.6, 0.4, 'triangle', 0.35);
}

function playMelody() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 659.25, 523.25].forEach((freq, i) => playTone(freq, now + i * 0.18, 0.4, 'sine', 0.22));
}

function playPing() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  playTone(1200, now, 0.15, 'square', 0.15);
  playTone(1600, now + 0.2, 0.15, 'square', 0.15);
  playTone(2000, now + 0.4, 0.3, 'square', 0.18);
}

const SOUND_MAP = { chime: playChime, bell: playBell, melody: playMelody, ping: playPing };

function playSoundOnce(mode) {
  const preset = ringtoneSettings[mode] || RINGTONE_DEFAULTS[mode];
  if (preset === 'custom' && customAudioBuffer) {
    const audio = new Audio(customAudioBuffer);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    return;
  }
  (SOUND_MAP[preset] || SOUND_MAP[RINGTONE_DEFAULTS[mode]])();
}

function playRingtone(mode) {
  stopRingtoneLoop();
  const preset = ringtoneSettings[mode] || RINGTONE_DEFAULTS[mode];
  if (preset === 'custom' && customAudioBuffer) {
    ringtonePlayingAudio = new Audio(customAudioBuffer);
    ringtonePlayingAudio.volume = 0.7;
    ringtonePlayingAudio.loop = false;
    ringtonePlayingAudio.addEventListener('ended', function loopCustom() {
      if (!ringtonePlayingAudio) return;
      ringtonePlayingAudio.currentTime = 0;
      ringtonePlayingAudio.play().catch(() => {});
    });
    ringtonePlayingAudio.play().catch(() => {});
    return;
  }
  const fn = SOUND_MAP[preset] || SOUND_MAP[RINGTONE_DEFAULTS[mode]];
  fn();
  ringtoneLoopId = setInterval(fn, 1000);
}

function stopRingtoneLoop() {
  if (ringtoneLoopId) { clearInterval(ringtoneLoopId); ringtoneLoopId = null; }
  if (ringtonePlayingAudio) {
    ringtonePlayingAudio.pause();
    ringtonePlayingAudio.removeEventListener('ended', () => {});
    ringtonePlayingAudio = null;
  }
}

function dismissRingtone() {
  stopRingtoneLoop();
  document.getElementById('timesupOverlay').classList.add('hidden');
}

function showTimesUpOverlay() {
  const labels = { work: '专注 25 分钟', short: '短休息 5 分钟', long: '长休息 15 分钟', custom: '自定义计时' };
  const titles = { work: '专注结束！', short: '休息结束！', long: '休息结束！', custom: '时间到！' };
  document.getElementById('timesupTitle').textContent = titles[focusMode] || '时间到！';
  document.getElementById('timesupSubtitle').textContent = (labels[focusMode] || '计时') + '已结束';
  document.getElementById('timesupOverlay').classList.remove('hidden');
}

function testRingtone(mode) { playSoundOnce(mode); }

function setFocusMode(mode, el) {
  document.querySelectorAll('.focus-mode-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  focusMode = mode;
  const customRow = document.getElementById('focusCustomRow');
  if (mode === 'custom') {
    customRow.style.display = '';
    focusSeconds = (parseInt(document.getElementById('focusCustomMin').value) || 25) * 60;
  } else {
    customRow.style.display = 'none';
    if (mode === 'work') focusSeconds = 25 * 60;
    else if (mode === 'short') focusSeconds = 5 * 60;
    else focusSeconds = 15 * 60;
  }
  focusTotalSeconds = focusSeconds;
  updateFocusDisplay();
}

function applyCustomFocus() {
  if (focusMode !== 'custom') return;
  const customMin = Math.max(1, Math.min(120, parseInt(document.getElementById('focusCustomMin').value) || 25));
  document.getElementById('focusCustomMin').value = customMin;
  focusSeconds = customMin * 60;
  focusTotalSeconds = focusSeconds;
  updateFocusDisplay();
}

function updateFocusDisplay() {
  const m = Math.floor(focusSeconds / 60).toString().padStart(2, '0');
  const s = (focusSeconds % 60).toString().padStart(2, '0');
  document.getElementById('focusTimer').textContent = m + ':' + s;
  const progress = focusTotalSeconds > 0 ? (focusTotalSeconds - focusSeconds) / focusTotalSeconds : 0;
  document.getElementById('focusRing').style.strokeDashoffset = 628.32 * (1 - progress);
}

function toggleFocus() {
  if (!focusRunning) {
    focusRunning = true;
    focusTotalSeconds = focusSeconds;
    document.getElementById('focusStartBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>暂停';
    focusInterval = setInterval(() => {
      if (focusSeconds > 0) { focusSeconds--; updateFocusDisplay(); }
      else {
        clearInterval(focusInterval); focusInterval = null; focusRunning = false;
        document.getElementById('focusStartBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>开始专注';
        playRingtone(focusMode);
        showTimesUpOverlay();
        const today = getDateKey(new Date().toISOString());
        appData.focusLog.push({ date: today, mode: focusMode, duration: focusTotalSeconds, completedAt: new Date().toISOString() });
        saveData(appData);
        updateFocusStats();
      }
    }, 1000);
  } else {
    clearInterval(focusInterval); focusInterval = null; focusRunning = false;
    document.getElementById('focusStartBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>开始专注';
  }
}

function resetFocus() {
  if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
  focusRunning = false;
  stopRingtoneLoop();
  document.getElementById('timesupOverlay').classList.add('hidden');
  document.getElementById('focusStartBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>开始专注';
  if (focusMode === 'custom') {
    focusSeconds = (parseInt(document.getElementById('focusCustomMin').value) || 25) * 60;
  } else if (focusMode === 'work') focusSeconds = 25 * 60;
  else if (focusMode === 'short') focusSeconds = 5 * 60;
  else focusSeconds = 15 * 60;
  focusTotalSeconds = focusSeconds;
  updateFocusDisplay();
}

function updateFocusStats() {
  const today = getDateKey(new Date().toISOString());
  const todayLog = appData.focusLog.filter(l => l.date === today);
  document.getElementById('focusSessions').textContent = todayLog.length;
  const totalMin = Math.round(appData.focusLog.reduce((s, l) => s + l.duration, 0) / 60);
  document.getElementById('focusTotalTime').textContent = totalMin + 'm';

  let streak = 0;
  const allDates = [...new Set(appData.focusLog.map(l => l.date))].sort().reverse();
  const checkDate = new Date();
  for (const dateStr of allDates) {
    const d = getDateKey(checkDate.toISOString());
    if (dateStr === d) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else if (dateStr === getDateKey(new Date(checkDate.getTime() - 86400000).toISOString())) { streak++; checkDate.setDate(checkDate.getDate() - 2); }
    else break;
  }
  document.getElementById('focusStreak').textContent = streak;
  renderFocusHistory();
}

// === Focus history management ===
let focusHistoryDate = new Date();
let focusHistoryExpanded = false;

function toggleFocusHistory() {
  focusHistoryExpanded = !focusHistoryExpanded;
  const body = document.getElementById('focusHistoryBody');
  const arrow = document.getElementById('arrow_focusHistory');
  if (focusHistoryExpanded) {
    body.style.display = '';
    arrow.textContent = '▼';
  } else {
    body.style.display = 'none';
    arrow.textContent = '▶';
  }
  if (focusHistoryExpanded) renderFocusHistory();
}

function navFocusHistory(dir) {
  const proposed = new Date(focusHistoryDate);
  proposed.setDate(proposed.getDate() + dir);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (proposed > today) return;
  focusHistoryDate = proposed;
  renderFocusHistory();
}

function renderFocusHistory() {
  const container = document.getElementById('focusHistoryList');
  const countEl = document.getElementById('focusLogCount');
  const todayCountEl = document.getElementById('focusTodayCount');
  const dateLabelEl = document.getElementById('focusHistoryDateLabel');

  const total = appData.focusLog.length;
  const todayKey = getDateKey(new Date().toISOString());
  const todayCount = appData.focusLog.filter(l => l.date === todayKey).length;
  countEl.textContent = total;
  todayCountEl.textContent = todayCount;

  const selectedKey = getDateKey(focusHistoryDate.toISOString());
  dateLabelEl.textContent = focusHistoryDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const dayLogs = appData.focusLog.filter(l => l.date === selectedKey).reverse();

  if (!focusHistoryExpanded) return;

  if (dayLogs.length === 0) {
    container.innerHTML = '<div class="focus-history-empty">当天暂无专注记录</div>';
    return;
  }

  const modeLabels = { work: '专注', short: '短休息', long: '长休息', custom: '自定义' };
  container.innerHTML = dayLogs.map((l) => {
    const globalIdx = appData.focusLog.indexOf(l);
    const date = new Date(l.completedAt);
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const min = Math.floor(l.duration / 60);
    const sec = l.duration % 60;
    const durStr = min > 0 ? min + 'm ' + sec + 's' : sec + 's';
    return `
      <div class="focus-history-item">
        <div class="focus-history-dot ${l.mode}"></div>
        <div class="focus-history-info">
          <div class="focus-history-mode">${modeLabels[l.mode] || l.mode}</div>
          <div class="focus-history-time">${timeStr}</div>
        </div>
        <div class="focus-history-duration">${durStr}</div>
        <button class="focus-history-del" onclick="deleteFocusLog(${globalIdx})" title="删除">×</button>
      </div>`;
  }).join('');
}

function deleteFocusLog(index) {
  if (index < 0 || index >= appData.focusLog.length) return;
  appData.focusLog.splice(index, 1);
  saveData(appData);
  updateFocusStats();
  renderFocusHistory();
}
