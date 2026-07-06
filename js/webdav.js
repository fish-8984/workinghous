// ============================================
// NUTSTORE WEBDAV SYNC
// ============================================
const WEBDAV_STORAGE_KEY = 'workinghours_webdav';

function getWebdavCreds() {
  try { return JSON.parse(localStorage.getItem(WEBDAV_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveWebdavCreds() {
  const el = document.getElementById('webdavSaveCreds');
  if (el && el.checked) {
    localStorage.setItem(WEBDAV_STORAGE_KEY, JSON.stringify({
      url: document.getElementById('webdavUrl').value.trim(),
      user: document.getElementById('webdavUser').value.trim(),
      pass: document.getElementById('webdavPass').value.trim(),
    }));
  } else {
    localStorage.removeItem(WEBDAV_STORAGE_KEY);
  }
}
function loadWebdavCreds() {
  const creds = getWebdavCreds();
  if (creds.url) { document.getElementById('webdavUrl').value = creds.url; fillWebdavDefaults(); }
  if (creds.user) document.getElementById('webdavUser').value = creds.user;
  if (creds.pass) document.getElementById('webdavPass').value = creds.pass;
  if (creds.url || creds.user) document.getElementById('webdavSaveCreds').checked = true;
}

function fillWebdavDefaults() {
  const urlEl = document.getElementById('webdavUrl');
  if (!urlEl.value) urlEl.value = 'https://dav.jianguoyun.com/dav/workinghours/';
}

function openWebdavModal() {
  fillWebdavDefaults();
  loadWebdavCreds();
  document.getElementById('webdavStatus').textContent = '';
  document.getElementById('webdavStatus').className = 'webdav-status';
  document.getElementById('webdavModal').classList.remove('hidden');
}
function closeWebdavModal() {
  document.getElementById('webdavModal').classList.add('hidden');
}

function getWebdavAuthHeaders() {
  const user = document.getElementById('webdavUser').value.trim();
  const pass = document.getElementById('webdavPass').value.trim();
  if (!user || !pass) return null;
  return { 'Authorization': 'Basic ' + btoa(user + ':' + pass) };
}

function resolveWebdavUrl(filename) {
  let base = document.getElementById('webdavUrl').value.trim();
  if (!base.endsWith('/')) base += '/';
  return base + (filename || 'workinghours-backup.json');
}

function setWebdavStatus(msg, cls) {
  const el = document.getElementById('webdavStatus');
  el.textContent = msg;
  el.className = 'webdav-status ' + (cls || '');
}

async function testWebdav() {
  saveWebdavCreds();
  const url = resolveWebdavUrl('');
  const auth = getWebdavAuthHeaders();
  if (!auth) { setWebdavStatus('⚠ 请填写坚果云账号和应用密码', 'error'); return; }

  setWebdavStatus('⏳ 正在连接坚果云...', 'loading');
  try {
    const resp = await fetch(url, { method: 'HEAD', headers: auth });
    if (resp.ok) {
      setWebdavStatus('✅ 连接成功！坚果云 WebDAV 可用', 'success');
    } else if (resp.status === 401 || resp.status === 403) {
      setWebdavStatus('❌ 认证失败，请检查账号和应用密码', 'error');
    } else if (resp.status === 404) {
      setWebdavStatus('✅ 连接成功，目录待创建（首次同步时自动创建）', 'success');
    } else {
      setWebdavStatus('❌ 连接异常 (HTTP ' + resp.status + ')', 'error');
    }
  } catch (e) {
    setWebdavStatus('❌ 网络错误: ' + e.message, 'error');
  }
}

async function webdavUpload() {
  saveWebdavCreds();
  const url = resolveWebdavUrl('workinghours-backup.json');
  const auth = getWebdavAuthHeaders();
  if (!auth) { setWebdavStatus('⚠ 请填写坚果云账号和应用密码', 'error'); return; }

  setWebdavStatus('⏳ 正在上传到坚果云...', 'loading');
  try {
    const body = JSON.stringify(appData, null, 2);
    const resp = await fetch(url, { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: body });
    if (resp.ok || resp.status === 201) {
      const now = new Date().toLocaleString('zh-CN');
      setWebdavStatus('✅ 同步成功！' + now, 'success');
      showToast('☁️ 数据已同步到坚果云', 'success');
    } else if (resp.status === 401 || resp.status === 403) {
      setWebdavStatus('❌ 认证失败，请检查账号和应用密码', 'error');
    } else if (resp.status === 507) {
      setWebdavStatus('❌ 坚果云空间不足', 'error');
    } else {
      setWebdavStatus('❌ 上传失败 (HTTP ' + resp.status + ')', 'error');
    }
  } catch (e) {
    setWebdavStatus('❌ 上传错误: ' + e.message, 'error');
  }
}

async function webdavDownload() {
  saveWebdavCreds();
  const url = resolveWebdavUrl('workinghours-backup.json');
  const auth = getWebdavAuthHeaders();
  if (!auth) { setWebdavStatus('⚠ 请填写坚果云账号和应用密码', 'error'); return; }

  setWebdavStatus('⏳ 正在从坚果云下载...', 'loading');
  try {
    const resp = await fetch(url, { method: 'GET', headers: auth });
    if (!resp.ok) {
      if (resp.status === 404) setWebdavStatus('❌ 云端暂无备份文件，请先上传', 'error');
      else if (resp.status === 401 || resp.status === 403) setWebdavStatus('❌ 认证失败，请检查账号和应用密码', 'error');
      else setWebdavStatus('❌ 下载失败 (HTTP ' + resp.status + ')', 'error');
      return;
    }
    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      if (!data.entries || !data.projects || !data.focusLog) {
        setWebdavStatus('❌ 云端备份文件格式无效', 'error');
        return;
      }
      if (!confirm(
        '将从云端恢复以下数据：\n' +
        '📋 时间记录：' + data.entries.length + ' 条\n' +
        '📁 项目：' + data.projects.length + ' 个\n' +
        '🎯 专注记录：' + (data.focusLog ? data.focusLog.length : 0) + ' 条\n\n' +
        '当前数据将被覆盖，确定继续？'
      )) return;

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

      const count = data.entries.length + data.projects.length + (data.focusLog ? data.focusLog.length : 0);
      setWebdavStatus('✅ 云端数据已恢复（' + count + ' 条记录）', 'success');
      showToast('☁️ 已从坚果云恢复数据', 'success');
    } catch (e) {
      setWebdavStatus('❌ 云端文件解析失败，可能已损坏', 'error');
    }
  } catch (e) {
    setWebdavStatus('❌ 网络错误: ' + e.message, 'error');
  }
}

// Close WebDAV modal on overlay click
document.getElementById('webdavModal').addEventListener('click', function(e) {
  if (e.target === this) closeWebdavModal();
});
