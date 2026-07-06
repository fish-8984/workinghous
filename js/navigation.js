// ============================================
// MOBILE SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================
// CLOCK
// ============================================
function updateClock() {
  document.getElementById('currentTime').textContent = new Date().toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' });
}
updateClock();
setInterval(updateClock, 10000);

// ============================================
// NAVIGATION
// ============================================
const viewTitles = { timer:'计时器', entries:'时间记录', calendar:'日历', reports:'报表', tasks:'项目', focus:'专注' };

function switchView(view, el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + view).classList.add('active');
  document.getElementById('viewTitle').textContent = viewTitles[view];

  closeSidebar();

  const dateNav = document.getElementById('dateNav');
  if (view === 'entries') { dateNav.style.display = ''; updateDateNav(); } else { dateNav.style.display = 'none'; }

  if (view === 'timer') { renderTimerView(); }
  else if (view === 'entries') { renderEntriesView(); }
  else if (view === 'calendar') { renderCalendar(); }
  else if (view === 'reports') { renderReportsView(); }
  else if (view === 'tasks') { renderTasksView(); }
  else if (view === 'focus') { updateFocusStats(); }
}

// ============================================
// DATE NAVIGATOR (for entries)
// ============================================
let entryNavDate = new Date();
let entryGrouping = 'day';

function updateDateNav() {
  const dd = document.getElementById('dateDisplay');
  if (entryGrouping === 'day') {
    dd.textContent = entryNavDate.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } else if (entryGrouping === 'month') {
    dd.textContent = entryNavDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  } else if (entryGrouping === 'year') {
    dd.textContent = entryNavDate.getFullYear() + '年';
  }
  renderEntriesView();
}

function navDate(dir) {
  const now = new Date();
  const proposed = new Date(entryNavDate);
  if (entryGrouping === 'day') {
    proposed.setDate(proposed.getDate() + dir);
  } else if (entryGrouping === 'month') {
    proposed.setMonth(proposed.getMonth() + dir);
    proposed.setDate(1);
  } else if (entryGrouping === 'year') {
    proposed.setFullYear(proposed.getFullYear() + dir);
    proposed.setMonth(0); proposed.setDate(1);
  }
  // Block future navigation
  if (entryGrouping === 'day' && proposed > now) return;
  if (entryGrouping === 'month') {
    const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const propMonth = new Date(proposed.getFullYear(), proposed.getMonth(), 1);
    if (propMonth > nowMonth) return;
  }
  if (entryGrouping === 'year' && proposed.getFullYear() > now.getFullYear()) return;

  entryNavDate = proposed;
  updateDateNav();
}
