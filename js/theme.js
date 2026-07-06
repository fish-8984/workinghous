// ============================================
// THEME
// ============================================
const theme = localStorage.getItem('workinghours_theme') || 'dark';
document.documentElement.setAttribute('data-theme', theme);

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('workinghours_theme', next);
}
