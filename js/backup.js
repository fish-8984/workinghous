// ============================================
// BACKUP & RESTORE
// ============================================
function exportBackup() {
  const data = JSON.stringify(appData, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workinghours-backup-' + getDateKey(new Date().toISOString()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ 数据备份已导出', 'success');
}

function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const data = JSON.parse(reader.result);
      if (!data.entries || !data.projects || !data.focusLog) {
        showToast('✗ 备份文件格式无效', 'warning');
        return;
      }
      if (!confirm('确定要恢复备份吗？当前数据将被覆盖，此操作不可撤销。')) return;
      appData = data;
      if (!appData.focusLog) appData.focusLog = [];
      saveData(appData);
      selectedProjectId = appData.projects.length > 0 ? appData.projects[0].id : '';
      initProjectSelector();
      renderTimerView();
      renderEntriesView();
      renderCalendar();
      renderReportsView();
      renderTasksView();
      updateFocusStats();
      showToast('✓ 数据已恢复', 'success');
    } catch (e) {
      showToast('✗ 文件解析失败，请检查格式', 'warning');
    }
  };
  reader.readAsText(file);
  input.value = '';
}
