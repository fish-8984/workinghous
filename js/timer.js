// ============================================
// PROJECT SELECTOR
// ============================================
let selectedProjectId = appData.projects.length > 0 ? appData.projects[0].id : '';

function toggleProjectDropdown() {
  const dd = document.getElementById('projectDropdown');
  if (dd.classList.contains('open')) { dd.classList.remove('open'); return; }

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    dd.style.left = '12px';
    dd.style.right = '12px';
    dd.style.top = 'auto';
    dd.style.bottom = '90px';
    dd.style.width = 'auto';
    dd.style.maxWidth = 'none';
    dd.style.minWidth = 'auto';
  } else {
    const sel = document.getElementById('projectSelect');
    const rect = sel.getBoundingClientRect();
    dd.style.left = rect.left + 'px';
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.right = '';
    dd.style.bottom = '';
    dd.style.width = '';
    dd.style.maxWidth = '';
    dd.style.minWidth = '';
  }

  dd.innerHTML = appData.projects.map(p => `
    <div class="timer-project-opt" onclick="selectProject('${p.id}')">
      <div class="timer-project-dot" style="background:${p.color};${p.id===selectedProjectId?'box-shadow:0 0 0 2px var(--bg-surface),0 0 0 5px '+p.color:''}"></div>
      <span>${p.name}</span>
    </div>
  `).join('');
  dd.classList.add('open');
}

function selectProject(pid) {
  selectedProjectId = pid;
  const p = appData.projects.find(pr => pr.id === pid);
  document.getElementById('selectedProject').textContent = p ? p.name : '选择项目...';
  document.getElementById('taskDot').style.background = p ? p.color : 'var(--text-muted)';
  document.getElementById('projectDropdown').classList.remove('open');

  if (timerState === 'running' && p) {
    document.getElementById('timerLabel').textContent = '正在计时 — ' + p.name;
  }
  updateEarningsDisplay();
}

function initProjectSelector() {
  const p = appData.projects.find(pr => pr.id === selectedProjectId);
  if (p) {
    document.getElementById('selectedProject').textContent = p.name;
    document.getElementById('taskDot').style.background = p.color;
  }
}
initProjectSelector();

// ============================================
// TIMER STATE
// ============================================
let timerState = 'idle';
let timerSeconds = 0;
let timerInterval = null;
let timerStartTime = null;

const TIMER_KEY = 'workinghours_timer';

function saveTimerState() {
  if (timerState === 'idle') return;
  localStorage.setItem(TIMER_KEY, JSON.stringify({
    state: timerState,
    projectId: selectedProjectId,
    startTime: timerStartTime ? timerStartTime.toISOString() : null,
    accumulatedSeconds: timerSeconds,
    savedAt: Date.now(),
  }));
}

function clearTimerState() {
  localStorage.removeItem(TIMER_KEY);
}

function restoreTimerState() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);

    selectedProjectId = saved.projectId || selectedProjectId;
    timerStartTime = saved.startTime ? new Date(saved.startTime) : null;

    if (saved.state === 'running') {
      // Recalculate elapsed seconds since save moment
      timerSeconds = saved.accumulatedSeconds + Math.floor((Date.now() - saved.savedAt) / 1000);
      timerState = 'running';

      const p = getSelectedProject();
      selectProject(selectedProjectId);
      document.getElementById('timerHero').classList.add('running');
      document.getElementById('taskDot').classList.add('pulse');
      document.getElementById('btnStart').style.display = 'none';
      document.getElementById('btnPause').style.display = '';
      document.getElementById('btnStop').style.display = '';
      document.getElementById('timerLabel').textContent = '正在计时 — ' + p.name;

      updateTimerDisplay();
      updateEarningsDisplay();

      timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
        updateEarningsDisplay();
        updateTodayStats();
      }, 1000);

      // Periodically save to handle long-running sessions
      setInterval(saveTimerState, 30000);

    } else if (saved.state === 'paused') {
      timerSeconds = saved.accumulatedSeconds;
      timerState = 'paused';

      selectProject(selectedProjectId);
      document.getElementById('timerHero').classList.remove('running');
      document.getElementById('taskDot').classList.remove('pulse');
      document.getElementById('btnStart').style.display = 'none';
      document.getElementById('btnPause').style.display = '';
      document.getElementById('btnStop').style.display = '';
      document.getElementById('btnPause').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>继续';
      document.getElementById('timerLabel').textContent = '已暂停';

      updateTimerDisplay();
      updateEarningsDisplay();
    }

  } catch (e) {
    localStorage.removeItem(TIMER_KEY);
  }
}

// Save before page unload
window.addEventListener('beforeunload', saveTimerState);

function getSelectedProject() {
  return appData.projects.find(p => p.id === selectedProjectId) || appData.projects[0] || { id:'', name:'未分类', color:'#e8a850', rate:0 };
}

function updateTimerDisplay() {
  const h = Math.floor(timerSeconds / 3600).toString().padStart(2,'0');
  const m = Math.floor((timerSeconds % 3600) / 60).toString().padStart(2,'0');
  const s = (timerSeconds % 60).toString().padStart(2,'0');
  document.getElementById('timerClock').textContent = h + ':' + m + ':' + s;
}

function updateEarningsDisplay() {
  if (timerSeconds > 0) {
    document.getElementById('timerEarnings').textContent = formatDurationSmart(timerSeconds);
  } else {
    document.getElementById('timerEarnings').textContent = '';
  }
}

function startTimer() {
  if (timerState !== 'idle') return;
  const p = getSelectedProject();
  if (!p || !p.name) {
    document.getElementById('selectedProject').textContent = '请先选择项目';
    return;
  }

  timerState = 'running';
  timerStartTime = new Date();
  saveTimerState();
  document.getElementById('timerHero').classList.add('running');
  document.getElementById('taskDot').classList.add('pulse');
  document.getElementById('btnStart').style.display = 'none';
  document.getElementById('btnPause').style.display = '';
  document.getElementById('btnStop').style.display = '';
  document.getElementById('timerLabel').textContent = '正在计时 — ' + p.name;

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
    updateEarningsDisplay();
    updateTodayStats();
  }, 1000);
}

function pauseTimer() {
  if (timerState === 'idle') return;
  if (timerState === 'running') {
    clearInterval(timerInterval); timerInterval = null;
    timerState = 'paused';
    saveTimerState();
    document.getElementById('timerHero').classList.remove('running');
    document.getElementById('taskDot').classList.remove('pulse');
    document.getElementById('btnPause').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>继续';
    document.getElementById('timerLabel').textContent = '已暂停';
  } else {
    timerState = 'running';
    saveTimerState();
    document.getElementById('timerHero').classList.add('running');
    document.getElementById('taskDot').classList.add('pulse');
    document.getElementById('btnPause').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>暂停';
    const p = getSelectedProject();
    document.getElementById('timerLabel').textContent = '正在计时 — ' + p.name;
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
      updateEarningsDisplay();
      updateTodayStats();
    }, 1000);
  }
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  const p = getSelectedProject();
  const now = new Date();
  const duration = timerSeconds;

  if (duration >= 60) {
    const entry = {
      id: genId(),
      projectId: p.id,
      projectName: p.name,
      projectColor: p.color,
      startTime: timerStartTime.toISOString(),
      endTime: now.toISOString(),
      duration: duration,
    };
    appData.entries.unshift(entry);
    saveData(appData);
  } else if (timerState !== 'idle') {
    showToast('⚠ 计时不足 1 分钟，未保存记录', 'warning');
  }

  timerState = 'idle'; timerSeconds = 0; timerStartTime = null;
  clearTimerState();
  document.getElementById('timerHero').classList.remove('running');
  document.getElementById('taskDot').classList.remove('pulse');
  document.getElementById('btnStart').style.display = '';
  document.getElementById('btnPause').style.display = 'none';
  document.getElementById('btnStop').style.display = 'none';
  document.getElementById('btnPause').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>暂停';
  document.getElementById('timerLabel').textContent = '今日工时';

  updateTimerDisplay();
  document.getElementById('timerEarnings').textContent = '';
  renderTimerView();
}

// ============================================
// TIMER VIEW RENDER
// ============================================
function getTodayEntries() {
  const today = getDateKey(new Date().toISOString());
  return appData.entries.filter(e => getDateKey(e.startTime) === today);
}

function updateTodayStats() {
  const todayEntries = getTodayEntries();
  const totalSeconds = todayEntries.reduce((s, e) => s + e.duration, 0) + (timerState !== 'idle' ? timerSeconds : 0);
  const activeProjectIds = new Set(todayEntries.map(e => e.projectId));
  if (timerState !== 'idle') activeProjectIds.add(selectedProjectId);

  document.getElementById('statTodayTime').textContent = formatDuration(totalSeconds);
  document.getElementById('statTodayEntries').textContent = todayEntries.length + (timerState !== 'idle' ? ' (+1)' : '');
  document.getElementById('statTodayEarnings').textContent = activeProjectIds.size;
}

function renderTimerView() {
  updateTodayStats();
  const todayEntries = getTodayEntries();
  const container = document.getElementById('todayEntries');

  if (todayEntries.length === 0 && timerState === 'idle') {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无记录，点击开始计时</div></div>';
    return;
  }

  let html = '';
  if (timerState !== 'idle') {
    const p = getSelectedProject();
    html += `<div class="entry-item" style="background:var(--accent-soft);border-left:3px solid var(--accent)">
      <div class="entry-dot" style="background:${p.color}" class="timer-project-dot pulse"></div>
      <div class="entry-info"><div class="entry-name">${p.name}</div><div class="entry-meta">进行中...</div></div>
      <div class="entry-duration" style="color:var(--accent-strong)">${formatDuration(timerSeconds)}</div>
    </div>`;
  }

  todayEntries.forEach(e => {
    html += `<div class="entry-item">
      <div class="entry-dot" style="background:${e.projectColor}"></div>
      <div class="entry-info"><div class="entry-name">${e.projectName}</div><div class="entry-meta">${formatTime(e.startTime)} - ${formatTime(e.endTime)}</div></div>
      <div class="entry-duration">${formatDuration(e.duration)}</div>
    </div>`;
  });

  container.innerHTML = html;
}
