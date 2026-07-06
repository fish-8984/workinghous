// ============================================
// REPORTS
// ============================================
let reportMonthOffset = 0;

function navReportMonth(dir) {
  const newOffset = reportMonthOffset + dir;
  if (newOffset > 0) return;
  reportMonthOffset = newOffset;
  renderReportsView();
}

function renderReportsView() {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + reportMonthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const monthLabel = targetDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  document.getElementById('reportMonthLabel').textContent = monthLabel;
  document.getElementById('kpiMonthSub').textContent = monthLabel;

  const monthEntries = appData.entries.filter(e => {
    const d = new Date(e.startTime);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalSec = monthEntries.reduce((s, e) => s + e.duration, 0);
  const activeDays = new Set(monthEntries.map(e => getDateKey(e.startTime))).size;
  const activeProjects = new Set(monthEntries.map(e => e.projectId)).size;

  document.getElementById('kpiMonthHours').textContent = formatDurationSmart(totalSec);
  document.getElementById('kpiAvgHours').textContent = activeDays > 0 ? formatDurationSmart(Math.round(totalSec / activeDays)) : '0min';
  document.getElementById('kpiProjects').textContent = activeProjects;
  const completedThisMonth = appData.projects.filter(p => p.completed).length;
  document.getElementById('kpiMonthEarnings').textContent = completedThisMonth;

  renderTrendChart(year, month);

  const projectMap = {};
  monthEntries.forEach(e => {
    if (!projectMap[e.projectId]) projectMap[e.projectId] = { name: e.projectName, color: e.projectColor, seconds: 0 };
    projectMap[e.projectId].seconds += e.duration;
  });

  const dist = Object.values(projectMap).sort((a, b) => b.seconds - a.seconds);
  const maxSec = dist.length > 0 ? Math.max(...dist.map(d => d.seconds)) : 1;

  document.getElementById('projectDistribution').innerHTML = dist.length === 0
    ? '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">该月暂无数据</div></div>'
    : dist.map(d => `
      <div class="project-bar-row">
        <div class="project-bar-color" style="background:${d.color}"></div>
        <div class="project-bar-name">${d.name}</div>
        <div class="project-bar-track"><div class="project-bar-fill" style="width:${(d.seconds/maxSec*100).toFixed(0)}%;background:${d.color}"></div></div>
        <div class="project-bar-hours">${formatDurationSmart(d.seconds)}</div>
      </div>
    `).join('');
}

function renderTrendChart(year, month) {
  const canvas = document.getElementById('trendChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = 200;

  const now = new Date();
  const days = [];
  const endDate = (year === now.getFullYear() && month === now.getMonth()) ? now : new Date(year, month + 1, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate); d.setDate(d.getDate() - i);
    if (d.getMonth() !== month) continue;
    const key = getDateKey(d.toISOString());
    const dayEntries = appData.entries.filter(e => getDateKey(e.startTime) === key);
    const totalSec = dayEntries.reduce((s, e) => s + e.duration, 0);
    const label = (d.getMonth()+1) + '/' + d.getDate();
    days.push({ label, totalSec });
  }

  const maxHours = Math.max(...days.map(d => d.totalSec / 3600), 0.5) * 1.2;

  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 30, bottom: 30, left: 40 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#6b6965';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const valSec = (maxHours / 4) * (4 - i) * 3600;
    const y = pad.top + (ch / 4) * i;
    ctx.fillText(formatDurationSmart(valSec), pad.left - 6, y + 3);
  }

  ctx.textAlign = 'center';
  const barWidth = cw / days.length;
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e8a850';

  days.forEach((d, i) => {
    const hours = d.totalSec / 3600;
    const x = pad.left + barWidth * i;
    const barH = (hours / maxHours) * ch;
    const barY = pad.top + ch - barH;

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    const bw = barWidth * 0.6;
    const bx = x + (barWidth - bw) / 2;
    const radius = 4;
    ctx.moveTo(bx + radius, barY);
    ctx.lineTo(bx + bw - radius, barY);
    ctx.quadraticCurveTo(bx + bw, barY, bx + bw, barY + radius);
    ctx.lineTo(bx + bw, pad.top + ch);
    ctx.lineTo(bx, pad.top + ch);
    ctx.lineTo(bx, barY + radius);
    ctx.quadraticCurveTo(bx, barY, bx + radius, barY);
    ctx.fill();

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#e8e6e3';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(formatDurationSmart(d.totalSec), x + barWidth / 2, barY - 6);

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#6b6965';
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.fillText(d.label, x + barWidth / 2, H - 6);
  });
}
