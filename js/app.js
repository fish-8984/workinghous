// ============================================
// INIT & EVENT LISTENERS
// ============================================
restoreTimerState();
updateFocusStats();
renderTimerView();
applyRingtoneUI();

// Handle window resize for chart
window.addEventListener('resize', () => {
  const panel = document.getElementById('panel-reports');
  if (panel.classList.contains('active')) renderTrendChart();
});

// Close dropdown on click outside
document.addEventListener('click', (e) => {
  const dd = document.getElementById('projectDropdown');
  const sel = document.getElementById('projectSelect');
  if (dd.classList.contains('open') && !sel.contains(e.target)) dd.classList.remove('open');
});

// Close dropdown on scroll or resize
document.querySelector('.content').addEventListener('scroll', () => {
  document.getElementById('projectDropdown').classList.remove('open');
});
window.addEventListener('resize', () => {
  document.getElementById('projectDropdown').classList.remove('open');
});

// Close project modal on overlay click
document.getElementById('projectModal').addEventListener('click', function(e) {
  if (e.target === this) closeProjectModal();
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === ' ') { e.preventDefault(); if (timerState === 'idle') startTimer(); else if (timerState === 'running') pauseTimer(); }
  if (e.key === 'Escape') { closeProjectModal(); closeWebdavModal(); }
});
