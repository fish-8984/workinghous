// ============================================
// TASKS / PROJECTS
// ============================================
function renderTasksView() {
  const grid = document.getElementById('tasksGrid');
  const activeProjects = appData.projects.filter(p => !p.completed);
  const completedProjects = appData.projects.filter(p => p.completed);

  const totalEntries = appData.entries;
  const now = new Date();
  const monthEntries = appData.entries.filter(e => {
    const d = new Date(e.startTime);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  function buildCard(p) {
    const month = monthEntries.filter(e => e.projectId === p.id);
    const total = totalEntries.filter(e => e.projectId === p.id);
    const monthSec = month.reduce((s, e) => s + e.duration, 0);
    const totalSec = total.reduce((s, e) => s + e.duration, 0);
    const progressPercent = p.estimatedDuration > 0 ? Math.min(100, Math.round((totalSec / 3600 / p.estimatedDuration) * 100)) : 0;
    const estLabel = p.estimatedDuration > 0 ? p.estimatedDuration + 'h' : '未设定';

    return `<div class="task-card${p.completed ? ' completed' : ''}">
      <div class="task-card-bar" style="background:${p.color}"></div>
      <div class="task-card-name">${p.name}${p.completed ? ' <span style="color:var(--green);font-size:12px;font-weight:500">✓ 已完成</span>' : ''}</div>
      <div class="task-card-rate">预估 ${estLabel}${p.estimatedDuration > 0 ? ' · 进度 ' + progressPercent + '%' : ''}</div>
      ${p.estimatedDuration > 0 && !p.completed ? `<div class="progress-bar" style="margin-top:4px"><div class="progress-bar-fill" style="width:${progressPercent}%;background:${p.color}"></div></div>` : ''}
      <div class="task-card-stats">
        <div class="task-stat">
          <div class="task-stat-label">本月</div>
          <div class="task-stat-value">${formatDurationSmart(monthSec)}</div>
        </div>
        <div class="task-stat">
          <div class="task-stat-label">总计</div>
          <div class="task-stat-value">${formatDurationSmart(totalSec)}</div>
        </div>
        <div class="task-stat">
          <div class="task-stat-label">进度</div>
          <div class="task-stat-value">${progressPercent}%</div>
        </div>
      </div>
      <div class="task-card-actions">
        ${!p.completed ? `<button class="btn btn-primary btn-sm" onclick="startTimerOnProject('${p.id}')" style="flex:1">▶ 开始计时</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="editProject('${p.id}')">✎</button>
        <button class="btn btn-secondary btn-sm" onclick="toggleProjectCompleted('${p.id}')">${p.completed ? '↩ 恢复进行' : '✓ 标记完成'}</button>
      </div>
    </div>`;
  }

  if (appData.projects.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><div class="empty-state-text">暂无项目，点击右上角新建</div></div>';
    return;
  }

  // Render tabs into the header container
  document.getElementById('tasksTabs').innerHTML = `<div class="tasks-tabs">
    <button class="tasks-tab active" id="taskTabActive" onclick="switchTaskTab('active')">进行中 (${activeProjects.length})</button>
    <button class="tasks-tab" id="taskTabCompleted" onclick="switchTaskTab('completed')">已完成 (${completedProjects.length})</button>
  </div>`;

  let html = '';

  html += `<div id="taskTabContent_active">`;
  if (activeProjects.length === 0) {
    html += '<div class="empty-state"><div class="empty-state-icon">📁</div><div class="empty-state-text">暂无进行中项目</div></div>';
  } else {
    html += `<div class="tasks-grid">${activeProjects.map(p => buildCard(p)).join('')}</div>`;
  }
  html += `</div>`;

  html += `<div id="taskTabContent_completed" style="display:none">`;
  if (completedProjects.length === 0) {
    html += '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">暂无已完成项目</div></div>';
  } else {
    html += `<div class="tasks-grid">${completedProjects.map(p => buildCard(p)).join('')}</div>`;
  }
  html += `</div>`;

  grid.innerHTML = html;
}

function switchTaskTab(tab) {
  document.getElementById('taskTabActive').classList.toggle('active', tab === 'active');
  document.getElementById('taskTabCompleted').classList.toggle('active', tab === 'completed');
  document.getElementById('taskTabContent_active').style.display = tab === 'active' ? '' : 'none';
  document.getElementById('taskTabContent_completed').style.display = tab === 'completed' ? '' : 'none';
}

function toggleProjectCompleted(pid) {
  const p = appData.projects.find(pr => pr.id === pid);
  if (!p) return;
  p.completed = !p.completed;
  saveData(appData);
  renderTasksView();
  initProjectSelector();
  showToast(p.completed ? '✓ 项目已标记为完成' : '↩ 项目已恢复为进行中', 'success');
}

function startTimerOnProject(pid) {
  selectedProjectId = pid;
  const p = appData.projects.find(pr => pr.id === pid);
  document.getElementById('selectedProject').textContent = p.name;
  document.getElementById('taskDot').style.background = p.color;
  switchView('timer', document.querySelector('[data-view="timer"]'));
  startTimer();
}

let editingProjectId = null;

function openProjectModal(id) {
  editingProjectId = id || null;
  document.getElementById('modalEditId').value = id || '';
  document.getElementById('modalTitle').textContent = id ? '编辑项目' : '新建项目';
  document.getElementById('modalDeleteBtn').style.display = id ? '' : 'none';

  if (id) {
    const p = appData.projects.find(pr => pr.id === id);
    if (p) {
      document.getElementById('modalName').value = p.name;
      document.getElementById('modalEstimatedDuration').value = p.estimatedDuration || 0;
      selectColorInModal(p.color);
    }
  } else {
    document.getElementById('modalName').value = '';
    document.getElementById('modalEstimatedDuration').value = '120';
    selectColorInModal('#f0985c');
  }

  document.getElementById('projectModal').classList.remove('hidden');
}

function closeProjectModal() {
  document.getElementById('projectModal').classList.add('hidden');
  editingProjectId = null;
}

function selectColorInModal(color) {
  document.querySelectorAll('#colorPicker .color-option').forEach(o => o.classList.remove('selected'));
  const opt = document.querySelector(`#colorPicker .color-option[data-color="${color}"]`);
  if (opt) opt.classList.add('selected');
}

// Color picker clicks
document.querySelectorAll('#colorPicker .color-option').forEach(o => {
  o.addEventListener('click', function() {
    document.querySelectorAll('#colorPicker .color-option').forEach(x => x.classList.remove('selected'));
    this.classList.add('selected');
  });
});

function saveProject() {
  const name = document.getElementById('modalName').value.trim();
  const estimatedDuration = parseInt(document.getElementById('modalEstimatedDuration').value) || 0;
  const color = document.querySelector('#colorPicker .color-option.selected')?.dataset.color || '#f0985c';

  if (!name) return;

  if (editingProjectId) {
    const p = appData.projects.find(pr => pr.id === editingProjectId);
    if (p) { p.name = name; p.estimatedDuration = estimatedDuration; p.color = color; }
  } else {
    appData.projects.push({ id: genId(), name, estimatedDuration, rate: 0, color, completed: false });
  }

  saveData(appData);
  closeProjectModal();
  renderTasksView();
  initProjectSelector();
}

function editProject(id) { openProjectModal(id); }

function deleteProjectFromModal() {
  if (!editingProjectId) return;
  appData.projects = appData.projects.filter(p => p.id !== editingProjectId);
  if (selectedProjectId === editingProjectId) {
    selectedProjectId = appData.projects.length > 0 ? appData.projects[0].id : '';
    initProjectSelector();
  }
  saveData(appData);
  closeProjectModal();
  renderTasksView();
}
