// ============================================
// CALENDAR
// ============================================
let calendarMonthOffset = 0;

function navCalendarMonth(dir) {
  const newOffset = calendarMonthOffset + dir;
  if (newOffset > 0) return;
  calendarMonthOffset = newOffset;
  renderCalendar();
}

function renderCalendar() {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const today = now.getDate();
  const isCurrentMonth = calendarMonthOffset === 0;

  document.getElementById('calendarMonthLabel').textContent =
    targetDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 0).getDay();

  const monthEntries = {};
  appData.entries.forEach(e => {
    const d = new Date(e.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!monthEntries[day]) monthEntries[day] = [];
      monthEntries[day].push(e);
    }
  });

  const daysOfWeek = ['日','一','二','三','四','五','六'];
  let html = daysOfWeek.map(d => `<div class="calendar-header-cell">${d}</div>`).join('');

  for (let i = 0; i < startDay; i++) {
    html += '<div class="calendar-day other"><div class="calendar-day-num"></div></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === today;
    const entries = monthEntries[d] || [];
    const totalSec = entries.reduce((s, e) => s + e.duration, 0);
    const blocks = entries.map(e =>
      `<div class="calendar-block" style="background:${e.projectColor}" title="${e.projectName}: ${formatDurationSmart(e.duration)}">${e.projectName}</div>`
    ).join('');

    html += `<div class="calendar-day${isToday ? ' today' : ''}">
      <div class="calendar-day-num">${d}</div>
      <div class="calendar-blocks">${blocks}</div>
      ${totalSec > 0 ? `<div class="calendar-day-total">${formatDurationSmart(totalSec)}</div>` : ''}
    </div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;
}
