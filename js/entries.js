// ============================================
// ENTRIES VIEW
// ============================================
function setGrouping(mode, el) {
  entryGrouping = mode;
  entryNavDate = new Date();
  document.querySelectorAll('#entryGroupTabs .group-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  updateDateNav();
}

function renderEntriesView() {
  const container = document.getElementById('entriesGroups');

  if (entryGrouping === 'day') {
    const selectedKey = getDateKey(entryNavDate.toISOString());
    const dayEntries = appData.entries.filter(e => getDateKey(e.startTime) === selectedKey);

    if (dayEntries.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">' +
        entryNavDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' }) + ' 暂无记录</div></div>';
      return;
    }

    const totalSec = dayEntries.reduce((s, e) => s + e.duration, 0);
    const label = entryNavDate.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
    container.innerHTML = buildGroupCard(label, totalSec, dayEntries);

  } else if (entryGrouping === 'month') {
    const selYear = entryNavDate.getFullYear();
    const selMonth = entryNavDate.getMonth();
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const monthStart = new Date(selYear, selMonth, 1);
    const monthEnd = new Date(selYear, selMonth, daysInMonth, 23, 59, 59);

    const weeks = [];
    let weekStart = new Date(selYear, selMonth, 1);
    const dayOfWeek = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - (dayOfWeek - 1));

    while (weekStart <= monthEnd || weekStart.getMonth() === selMonth) {
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEntries = appData.entries.filter(e => {
        const d = new Date(e.startTime);
        return d >= weekStart && d <= new Date(weekEndDate.getFullYear(), weekEndDate.getMonth(), weekEndDate.getDate(), 23, 59, 59)
          && d.getFullYear() === selYear && d.getMonth() === selMonth;
      });

      const outOfRangeDays = [];
      for (let d = new Date(weekStart); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() !== selMonth) outOfRangeDays.push(d.getDate() + '/' + (d.getMonth() + 1));
      }

      const weekLabel = formatShortDate(weekStart) + ' - ' + formatShortDate(weekEndDate);
      const totalSec = weekEntries.reduce((s, e) => s + e.duration, 0);
      weeks.push({ label: weekLabel, entries: weekEntries, totalSec, outOfRangeDays });
      weekStart.setDate(weekStart.getDate() + 7);
      if (weekStart.getMonth() > selMonth && weekStart.getFullYear() >= selYear) break;
      if (weekStart.getFullYear() > selYear) break;
    }

    if (weeks.every(w => w.entries.length === 0)) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">' +
        entryNavDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) + ' 暂无记录</div></div>';
      return;
    }

    container.innerHTML = weeks.map((w, idx) => {
      const collapseId = 'weekCollapse' + idx;
      const outInfo = w.outOfRangeDays.length > 0 ?
        `<span style="color:var(--text-muted);font-size:11px;margin-left:8px">（${w.outOfRangeDays.join(', ')} 为跨月日期，不计入）</span>` : '';
      return `<div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:14px;overflow:hidden;margin-bottom:16px">
        <div class="group-header" style="cursor:pointer" onclick="toggleCollapse('${collapseId}')">
          <span class="group-title" style="display:flex;align-items:center;gap:6px">
            <span class="collapse-arrow" id="arrow_${collapseId}">▶</span> ${w.label}${outInfo}
          </span>
          <span class="group-total">${formatDurationSmart(w.totalSec)}</span>
        </div>
        <div id="${collapseId}" style="display:none">
          ${buildEntryItems(w.entries)}
        </div>
      </div>`;
    }).join('');

  } else if (entryGrouping === 'year') {
    const selYear = entryNavDate.getFullYear();
    const months = [];

    for (let m = 0; m < 12; m++) {
      const monthEntries = appData.entries.filter(e => {
        const d = new Date(e.startTime);
        return d.getFullYear() === selYear && d.getMonth() === m;
      });
      const label = new Date(selYear, m).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
      const totalSec = monthEntries.reduce((s, e) => s + e.duration, 0);
      months.push({ label, entries: monthEntries, totalSec, month: m });
    }

    const nonEmptyMonths = months.filter(m => m.entries.length > 0);
    if (nonEmptyMonths.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">' +
        selYear + '年 暂无记录</div></div>';
      return;
    }

    container.innerHTML = months.map((m, idx) => {
      if (m.entries.length === 0) return '';
      const collapseId = 'monthCollapse' + idx;
      return `<div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:14px;overflow:hidden;margin-bottom:16px">
        <div class="group-header" style="cursor:pointer" onclick="toggleCollapse('${collapseId}')">
          <span class="group-title" style="display:flex;align-items:center;gap:6px">
            <span class="collapse-arrow" id="arrow_${collapseId}">▶</span> ${m.label}
          </span>
          <span class="group-total">${formatDurationSmart(m.totalSec)}</span>
        </div>
        <div id="${collapseId}" style="display:none">
          ${buildEntryItems(m.entries)}
        </div>
      </div>`;
    }).join('');
  }
}

function buildGroupCard(label, totalSec, entries) {
  return `<div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:14px;overflow:hidden;margin-bottom:16px">
    <div class="group-header">
      <span class="group-title">${label}</span>
      <span class="group-total" style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;color:var(--accent)">
        ${formatDurationSmart(totalSec)}
      </span>
    </div>
    ${buildEntryItems(entries)}
  </div>`;
}

function buildEntryItems(entries) {
  return entries.map(e => `
    <div class="entry-item">
      <div class="entry-dot" style="background:${e.projectColor}"></div>
      <div class="entry-info"><div class="entry-name">${e.projectName}</div><div class="entry-meta">${formatTime(e.startTime)} - ${formatTime(e.endTime)}</div></div>
      <div class="entry-duration">${formatDurationSmart(e.duration)}</div>
      <button class="delete-btn-sm" onclick="deleteEntry('${e.id}')" title="删除">✕</button>
    </div>
  `).join('');
}

function deleteEntry(id) {
  appData.entries = appData.entries.filter(e => e.id !== id);
  saveData(appData);
  renderEntriesView();
  renderTimerView();
}
