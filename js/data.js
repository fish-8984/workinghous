// ============================================
// DATA LAYER
// ============================================
const STORAGE_KEY = 'workinghours_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], projects: [], focusLog: [] };
    return JSON.parse(raw);
  } catch { return { entries: [], projects: [], focusLog: [] }; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let appData = loadData();

// Ensure default projects
if (appData.projects.length === 0) {
  appData.projects = [
    { id: 'p1', name: '前端开发', color: '#f0985c', estimatedDuration: 120, completed: false },
    { id: 'p2', name: '后端开发', color: '#6ba4d8', estimatedDuration: 200, completed: false },
    { id: 'p3', name: 'UI 设计', color: '#a78bfa', estimatedDuration: 80, completed: false },
    { id: 'p4', name: '会议沟通', color: '#5cb878', estimatedDuration: 0, completed: false },
    { id: 'p5', name: '学习研究', color: '#5cc9b8', estimatedDuration: 0, completed: false },
  ];
}
if (!appData.focusLog) appData.focusLog = [];

// Ensure projects have new fields
appData.projects = appData.projects.map(p => ({
  ...p,
  estimatedDuration: p.estimatedDuration || 0,
  completed: p.completed || false,
  rate: p.rate || 0,
}));

// Ensure entries have full date strings
appData.entries = appData.entries.map(e => ({
  id: e.id || crypto.randomUUID(),
  projectId: e.projectId || '',
  projectName: e.projectName || '未知',
  projectColor: e.projectColor || '#e8a850',
  projectRate: e.projectRate || 0,
  startTime: e.startTime,
  endTime: e.endTime,
  duration: e.duration,
  earnings: typeof e.earnings === 'number' ? e.earnings : 0,
}));

function genId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36); }

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}

function formatCurrency(n) { return '¥' + Math.round(n).toLocaleString(); }

function formatDurationSmart(totalSeconds) {
  const hours = totalSeconds / 3600;
  if (hours < 1) {
    const minutes = Math.round(totalSeconds / 60);
    return minutes + 'min';
  }
  return hours.toFixed(1) + 'h';
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

function getDateKey(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function getMonthKey(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 7);
}

function formatShortDate(d) {
  return (d.getMonth() + 1) + '/' + d.getDate();
}

// Helper: toggle collapsible sections
function toggleCollapse(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById('arrow_' + id);
  if (el.style.display === 'none') {
    el.style.display = '';
    arrow.textContent = '▼';
  } else {
    el.style.display = 'none';
    arrow.textContent = '▶';
  }
}

// Toast notification
let toastTimer = null;
function showToast(msg, type) {
  const old = document.querySelector('.toast.show');
  if (old) old.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'info');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
