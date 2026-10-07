/* ============================================================
   Roile Earn9 — Admin Panel Logic (Part 1/3)
   ============================================================ */
'use strict';

/* Firebase Config (একই প্রজেক্ট) */
const firebaseConfig = {
  apiKey: "AIzaSyDQPP8lIg90S2Z1MWImCx261hVb_A-TV0g",
  authDomain: "roile-earn9.firebaseapp.com",
  databaseURL: "https://roile-earn9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "roile-earn9",
  storageBucket: "roile-earn9.firebasestorage.app",
  messagingSenderId: "408337081103",
  appId: "1:408337081103:web:b722c9328e008f8963947a"
};

let auth = null;
let db = null;
try {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();
  console.log('[Admin] Firebase initialized');
} catch (e) {
  console.error('[Admin] Firebase init failed:', e);
}

/* State */
const AState = {
  user: null,
  users: {},
  tasks: {},
  withdrawals: {},
  moderators: {},
  settings: {},
  currentTab: 'dashboard',
  wdFilter: 'all',
  userSearch: '',
  editingTaskId: null,
  listeners: {}
};

/* Helpers */
function $(id) { return document.getElementById(id); }
function $all(sel) { return document.querySelectorAll(sel); }

function showScreen(id) {
  $all('.admin-screen').forEach(function (s) { s.classList.remove('active'); });
  var el = $(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg, type) {
  type = type || 'info';
  var c = $('adminToast');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function () {
    t.style.opacity = '0';
    setTimeout(function () { t.remove(); }, 300);
  }, 3000);
}

function showError(elementId, msg) {
  var b = $(elementId);
  if (!b) return;
  b.className = 'msg-box error';
  b.textContent = msg;
  b.classList.remove('hidden');
}

function clearError(elementId) {
  var b = $(elementId);
  if (!b) return;
  b.className = 'msg-box hidden';
  b.textContent = '';
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(n) {
  return (Number(n) || 0).toFixed(2);
}

function formatDate(ts) {
  if (!ts) return '-';
  var d = new Date(ts);
  var months = ['জানু','ফেব','মার্চ','এপ্রি','মে','জুন','জুলা','আগ','সেপ','অক্টো','নভে','ডিসে'];
  var h = d.getHours();
  var m = String(d.getMinutes()).padStart(2, '0');
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + h + ':' + m + ' ' + ampm;
}

/* ============================================================
   AUTH
   ============================================================ */
async function handleAdminLogin() {
  clearError('adminLoginError');
  var email = ($('adminEmail').value || '').trim().toLowerCase();
  var pwd = $('adminPassword').value || '';
  if (!email) return showError('adminLoginError', 'ইমেইল দিন।');
  if (!pwd) return showError('adminLoginError', 'পাসওয়ার্ড দিন।');

  var btn = $('btnAdminLogin');
  btn.disabled = true;
  btn.textContent = 'অপেক্ষা করুন...';

  try {
    await auth.signInWithEmailAndPassword(email, pwd);
  } catch (err) {
    console.error('[AdminLogin]', err);
    showError('adminLoginError', 'লগইন ব্যর্থ: ' + (err.message || 'আবার চেষ্টা করুন'));
    btn.disabled = false;
    btn.textContent = 'লগইন';
  }
}

async function handleAdminGoogle() {
  clearError('adminLoginError');
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('[AdminGoogle]', err);
    showError('adminLoginError', 'Google লগইন ব্যর্থ: ' + (err.message || ''));
  }
}

async function handleAdminLogout() {
  if (!confirm('লগআউট করবেন?')) return;
  try {
    await auth.signOut();
    showToast('লগআউট হয়েছে', 'info');
  } catch (e) {
    showToast('সমস্যা হয়েছে', 'error');
  }
}

/* ============================================================
   AUTH STATE + ADMIN CHECK
   ============================================================ */
function initAdminAuth() {
  auth.onAuthStateChanged(async function (user) {
    if (!user) {
      AState.user = null;
      showScreen('admin-login');
      return;
    }

    // ✅ ধাপ ১: শুধুমাত্র এই ইমেইল গ্রহণ করা হবে
    var ALLOWED_ADMIN_EMAIL = 'riyadahmed10702@gmail.com';
    var userEmail = (user.email || '').toLowerCase().trim();

    if (userEmail !== ALLOWED_ADMIN_EMAIL) {
      alert('❌ আপনি এই প্যানেলের অ্যাডমিন নন।\n\nশুধু ' + ALLOWED_ADMIN_EMAIL + ' দিয়েই লগইন করা যাবে।');
      await auth.signOut();
      return;
    }

    // ✅ ধাপ ২: Firebase admins node-এ আছে কিনা চেক
    try {
      var snap = await db.ref('admins/' + user.uid).once('value');
      if (!snap.exists()) {
        alert('❌ আপনি অ্যাডমিন হিসেবে নিবন্ধিত নন।');
        await auth.signOut();
        return;
      }
    } catch (e) {
      console.error('[AdminCheck]', e);
      alert('চেক করা যায়নি: ' + e.message);
      await auth.signOut();
      return;
    }

    AState.user = user;
    $('adminName').textContent = user.displayName || 'Admin';
    $('adminEmailDisplay').textContent = user.email || user.uid.slice(0, 12);

    showScreen('admin-app');
    attachAllListeners();
  });
                   }
/* ============================================================
   LISTENERS
   ============================================================ */
function attachAllListeners() {
  // Users
  db.ref('users').on('value', function (s) {
    AState.users = s.val() || {};
    renderDashboard();
    renderUsers();
  });

  // Tasks
  db.ref('tasks').on('value', function (s) {
    AState.tasks = s.val() || {};
    renderDashboard();
    renderTasks();
  });

  // Withdrawals
  db.ref('withdrawals').on('value', function (s) {
    AState.withdrawals = s.val() || {};
    renderDashboard();
    renderWithdrawals();
  });

  // Moderators
  db.ref('moderators').on('value', function (s) {
    AState.moderators = s.val() || {};
    renderModerators();
  });

  // Settings
  db.ref('settings').on('value', function (s) {
    AState.settings = s.val() || {};
    fillSettings();
    var nt = $('noticeText');
    if (nt) nt.value = AState.settings.notice || '';
  });
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  var users = Object.keys(AState.users).length;

  var pending = 0;
  Object.keys(AState.withdrawals).forEach(function (k) {
    if (AState.withdrawals[k] && AState.withdrawals[k].status === 'pending') pending++;
  });

  var totalBalance = 0;
  Object.keys(AState.users).forEach(function (k) {
    totalBalance += Number(AState.users[k].balance) || 0;
  });

  var activeTasks = 0;
  Object.keys(AState.tasks).forEach(function (k) {
    if (AState.tasks[k] && AState.tasks[k].active) activeTasks++;
  });

  $('statUsers').textContent = users;
  $('statPendingWd').textContent = pending;
  $('statTotalBalance').textContent = '৳' + formatMoney(totalBalance);
  $('statTasks').textContent = activeTasks;
}

/* ============================================================
   USERS
   ============================================================ */
function renderUsers() {
  var list = $('usersList');
  if (!list) return;

  var search = (AState.userSearch || '').toLowerCase();
  var ids = Object.keys(AState.users).filter(function (uid) {
    var u = AState.users[uid];
    if (!search) return true;
    return (u.name || '').toLowerCase().indexOf(search) >= 0 ||
           (u.email || '').toLowerCase().indexOf(search) >= 0;
  });

  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state">কোনো ইউজার নেই।</div>';
    return;
  }

  list.innerHTML = ids.map(function (uid) {
    var u = AState.users[uid];
    var roleBadge = '';
    if (u.role === 'admin') roleBadge = '<span class="badge badge-admin">Admin</span>';
    else if (u.role === 'moderator') roleBadge = '<span class="badge badge-moderator">Moderator</span>';
    else roleBadge = '<span class="badge badge-active">User</span>';

    var banBadge = u.banned ? '<span class="badge badge-banned">Banned</span>' : '';

    var isMod = AState.moderators[uid] && AState.moderators[uid].active !== false;
    var promoteText = isMod ? 'Demote' : 'Promote';
    var promoteClass = isMod ? 'btn-warning' : 'btn-info';

    return '<div class="list-item">' +
      '<div class="list-item-head">' +
        '<div>' +
          '<div class="list-item-title">' + escapeHtml(u.name || 'Unnamed') + ' ' + roleBadge + ' ' + banBadge + '</div>' +
          '<div class="list-item-sub">' + escapeHtml(u.email || '') + '</div>' +
          '<div class="list-item-sub">ব্যালেন্স: ৳' + formatMoney(u.balance) + ' | রেফার: ' + (u.referralCount || 0) + '</div>' +
          '<div class="list-item-sub">UID: ' + escapeHtml(uid.slice(0, 14)) + '...</div>' +
        '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="btn ' + (u.banned ? 'btn-success' : 'btn-danger') + '" data-user-action="ban" data-uid="' + escapeHtml(uid) + '">' + (u.banned ? 'Unban' : 'Ban') + '</button>' +
        '<button class="btn btn-primary" data-user-action="balance" data-uid="' + escapeHtml(uid) + '">Edit ৳</button>' +
        '<button class="btn ' + promoteClass + '" data-user-action="promote" data-uid="' + escapeHtml(uid) + '">' + promoteText + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('button[data-user-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleUserAction(btn.dataset.userAction, btn.dataset.uid);
    });
  });
}

async function handleUserAction(action, uid) {
  var u = AState.users[uid];
  if (!u) return;

  if (action === 'ban') {
    var willBan = !u.banned;
    if (!confirm(willBan ? 'ইউজারকে Ban করবেন?' : 'Unban করবেন?')) return;
    await db.ref('users/' + uid + '/banned').set(willBan);
    showToast(willBan ? 'Ban করা হয়েছে' : 'Unban করা হয়েছে', 'success');
  }

  else if (action === 'balance') {
    var input = prompt('নতুন ব্যালেন্স (৳):', u.balance || 0);
    if (input === null) return;
    var val = Number(input);
    if (isNaN(val) || val < 0) return showToast('সঠিক সংখ্যা দিন', 'error');
    await db.ref('users/' + uid + '/balance').set(val);
    showToast('ব্যালেন্স আপডেট হয়েছে', 'success');
  }

  else if (action === 'promote') {
    var isMod = AState.moderators[uid] && AState.moderators[uid].active !== false;
    if (isMod) {
      if (!confirm('Moderator থেকে সরিয়ে দেবেন?')) return;
      await db.ref('moderators/' + uid).remove();
      await db.ref('users/' + uid + '/role').set('user');
      showToast('Demote করা হয়েছে', 'info');
    } else {
      if (!confirm('Moderator বানাবেন?')) return;
      await db.ref('moderators/' + uid).set({
        name: u.name || '',
        email: u.email || '',
        pendingCount: 0,
        active: true,
        appointedAt: Date.now()
      });
      await db.ref('users/' + uid + '/role').set('moderator');
      showToast('Moderator বানানো হয়েছে', 'success');
    }
  }
}

/* ============================================================
   TASKS
   ============================================================ */
function renderTasks() {
  var list = $('tasksAdminList');
  if (!list) return;

  var ids = Object.keys(AState.tasks);
  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state">কোনো টাস্ক নেই।</div>';
    return;
  }

  list.innerHTML = ids.map(function (tid) {
    var t = AState.tasks[tid];
    var activeBadge = t.active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-rejected">Inactive</span>';
    return '<div class="list-item">' +
      '<div class="list-item-head">' +
        '<div>' +
          '<div class="list-item-title">' + escapeHtml(t.title || '') + ' ' + activeBadge + '</div>' +
          '<div class="list-item-sub">' + escapeHtml(t.desc || '') + '</div>' +
          '<div class="list-item-sub">রিওয়ার্ড: ৳' + formatMoney(t.reward) + '</div>' +
          '<div class="list-item-sub">লিংক: ' + escapeHtml(t.link || '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="btn btn-info" data-task-action="edit" data-tid="' + escapeHtml(tid) + '">Edit</button>' +
        '<button class="btn btn-danger" data-task-action="delete" data-tid="' + escapeHtml(tid) + '">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('button[data-task-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleTaskAction(btn.dataset.taskAction, btn.dataset.tid);
    });
  });
}

function openTaskModal(taskId) {
  AState.editingTaskId = taskId || null;
  var modal = $('taskModal');
  modal.classList.remove('hidden');
  clearError('taskModalError');

  if (taskId && AState.tasks[taskId]) {
    var t = AState.tasks[taskId];
    $('taskModalTitle').textContent = 'টাস্ক এডিট';
    $('taskTitle').value = t.title || '';
    $('taskDesc').value = t.desc || '';
    $('taskLink').value = t.link || '';
    $('taskReward').value = t.reward || 0;
    $('taskActive').checked = !!t.active;
  } else {
    $('taskModalTitle').textContent = 'নতুন টাস্ক';
    $('taskTitle').value = '';
    $('taskDesc').value = '';
    $('taskLink').value = '';
    $('taskReward').value = '';
    $('taskActive').checked = true;
  }
}

function closeTaskModal() {
  $('taskModal').classList.add('hidden');
  AState.editingTaskId = null;
}

async function saveTask() {
  var title = ($('taskTitle').value || '').trim();
  var desc = ($('taskDesc').value || '').trim();
  var link = ($('taskLink').value || '').trim();
  var reward = Number($('taskReward').value || 0);
  var active = $('taskActive').checked;

  if (!title) return showError('taskModalError', 'টাইটেল দিন।');
  if (!link) return showError('taskModalError', 'লিংক দিন।');
  if (!reward || reward <= 0) return showError('taskModalError', 'রিওয়ার্ড দিন।');

  var data = { title: title, desc: desc, link: link, reward: reward, active: active };

  try {
    if (AState.editingTaskId) {
      await db.ref('tasks/' + AState.editingTaskId).update(data);
      showToast('টাস্ক আপডেট হয়েছে', 'success');
    } else {
      await db.ref('tasks').push(data);
      showToast('নতুন টাস্ক যোগ হয়েছে', 'success');
    }
    closeTaskModal();
  } catch (e) {
    console.error(e);
    showError('taskModalError', 'সেভ ব্যর্থ: ' + e.message);
  }
}

async function handleTaskAction(action, tid) {
  if (action === 'edit') return openTaskModal(tid);
  if (action === 'delete') {
    if (!confirm('টাস্ক ডিলিট করবেন?')) return;
    await db.ref('tasks/' + tid).remove();
    showToast('ডিলিট হয়েছে', 'info');
  }
    }
/* ============================================================
   WITHDRAWALS
   ============================================================ */
function renderWithdrawals() {
  var list = $('wdAdminList');
  if (!list) return;

  var items = Object.keys(AState.withdrawals).map(function (k) {
    return Object.assign({}, AState.withdrawals[k], { _id: k });
  }).filter(function (w) {
    if (AState.wdFilter === 'all') return true;
    return w.status === AState.wdFilter;
  }).sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state">কোনো উইথড্র নেই।</div>';
    return;
  }

  list.innerHTML = items.map(function (w) {
    var statusBadge = w.status === 'approved' ? '<span class="badge badge-approved">Approved</span>' :
                      w.status === 'rejected' ? '<span class="badge badge-rejected">Rejected</span>' :
                      '<span class="badge badge-pending">Pending</span>';
    var methodText = w.method === 'bkash' ? 'বিকাশ' : 'নগদ';
    var actionsHtml = '';
    if (w.status === 'pending') {
      actionsHtml = '<div class="list-item-actions">' +
        '<button class="btn btn-success" data-wd-action="approve" data-wid="' + escapeHtml(w._id) + '">Force Approve</button>' +
        '<button class="btn btn-danger" data-wd-action="reject" data-wid="' + escapeHtml(w._id) + '">Force Reject</button>' +
      '</div>';
    }

    return '<div class="list-item">' +
      '<div class="list-item-head">' +
        '<div>' +
          '<div class="list-item-title">' + escapeHtml(w.userName || '') + ' ' + statusBadge + '</div>' +
          '<div class="list-item-sub">' + methodText + ' • ' + escapeHtml(w.number || '') + '</div>' +
          '<div class="list-item-sub">পরিমাণ: ৳' + formatMoney(w.amount) + '</div>' +
          '<div class="list-item-sub">Moderator: ' + escapeHtml(w.assignedModName || 'None') + '</div>' +
          '<div class="list-item-sub">' + formatDate(w.timestamp) + '</div>' +
        '</div>' +
      '</div>' +
      actionsHtml +
    '</div>';
  }).join('');

  list.querySelectorAll('button[data-wd-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleWdAction(btn.dataset.wdAction, btn.dataset.wid);
    });
  });
}

async function handleWdAction(action, wid) {
  var w = AState.withdrawals[wid];
  if (!w || w.status !== 'pending') return showToast('Already processed', 'warning');

  if (action === 'approve') {
    if (!confirm('Force Approve করবেন?')) return;
    try {
      var now = Date.now();
      var uSnap = await db.ref('users/' + w.uid).once('value');
      var u = uSnap.val() || {};
      var newTotalWithdrawn = (Number(u.totalWithdrawn) || 0) + (Number(w.amount) || 0);

      var updates = {};
      updates['withdrawals/' + wid + '/status'] = 'approved';
      updates['withdrawals/' + wid + '/approvedBy'] = AState.user.uid;
      updates['withdrawals/' + wid + '/approvedAt'] = now;
      updates['withdrawals/' + wid + '/forceApproved'] = true;
      updates['users/' + w.uid + '/totalWithdrawn'] = newTotalWithdrawn;

      if (w.assignedMod) {
        var pcSnap = await db.ref('moderators/' + w.assignedMod + '/pendingCount').once('value');
        var currentPc = Number(pcSnap.val()) || 0;
        updates['moderators/' + w.assignedMod + '/pendingCount'] = Math.max(0, currentPc - 1);
      }

      await db.ref().update(updates);
      showToast('Approve হয়েছে', 'success');
    } catch (e) { showToast('সমস্যা: ' + e.message, 'error'); }
  }

  else if (action === 'reject') {
    var reason = prompt('বাতিলের কারণ:', 'Admin force reject');
    if (reason === null) return;
    try {
      var now2 = Date.now();
      var uSnap2 = await db.ref('users/' + w.uid).once('value');
      var u2 = uSnap2.val() || {};
      var newBalance = (Number(u2.balance) || 0) + (Number(w.amount) || 0);

      var updates2 = {};
      updates2['withdrawals/' + wid + '/status'] = 'rejected';
      updates2['withdrawals/' + wid + '/rejectedBy'] = AState.user.uid;
      updates2['withdrawals/' + wid + '/rejectedAt'] = now2;
      updates2['withdrawals/' + wid + '/rejectReason'] = reason;
      updates2['users/' + w.uid + '/balance'] = newBalance;

      if (w.assignedMod) {
        var pcSnap2 = await db.ref('moderators/' + w.assignedMod + '/pendingCount').once('value');
        var currentPc2 = Number(pcSnap2.val()) || 0;
        updates2['moderators/' + w.assignedMod + '/pendingCount'] = Math.max(0, currentPc2 - 1);
      }

      await db.ref().update(updates2);
      showToast('Reject ও refund হয়েছে', 'info');
    } catch (e) { showToast('সমস্যা: ' + e.message, 'error'); }
  }
}

/* ============================================================
   MODERATORS
   ============================================================ */
function renderModerators() {
  var list = $('modsAdminList');
  if (!list) return;

  var ids = Object.keys(AState.moderators);
  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state">কোনো মডারেটর নেই।</div>';
    return;
  }

  list.innerHTML = ids.map(function (uid) {
    var m = AState.moderators[uid];
    return '<div class="list-item">' +
      '<div class="list-item-head">' +
        '<div>' +
          '<div class="list-item-title">' + escapeHtml(m.name || 'Moderator') + '</div>' +
          '<div class="list-item-sub">' + escapeHtml(m.email || '') + '</div>' +
          '<div class="list-item-sub">Pending: ' + (m.pendingCount || 0) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="list-item-actions">' +
        '<button class="btn btn-warning" data-mod-action="reset" data-uid="' + escapeHtml(uid) + '">Reset Count</button>' +
        '<button class="btn btn-danger" data-mod-action="remove" data-uid="' + escapeHtml(uid) + '">Remove</button>' +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('button[data-mod-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleModAction(btn.dataset.modAction, btn.dataset.uid);
    });
  });
}

async function handleModAction(action, uid) {
  if (action === 'reset') {
    if (!confirm('Pending count 0 করবেন?')) return;
    await db.ref('moderators/' + uid + '/pendingCount').set(0);
    showToast('Reset হয়েছে', 'success');
  }
  if (action === 'remove') {
    if (!confirm('Moderator সরিয়ে দেবেন?')) return;
    await db.ref('moderators/' + uid).remove();
    await db.ref('users/' + uid + '/role').set('user');
    showToast('সরানো হয়েছে', 'info');
  }
}

/* ============================================================
   NOTICE + SETTINGS
   ============================================================ */
async function saveNotice() {
  var text = ($('noticeText').value || '').trim();
  if (!text) return showToast('নোটিশ লিখুন', 'warning');
  try {
    await db.ref('settings/notice').set(text);
    showToast('নোটিশ সেভ হয়েছে', 'success');
  } catch (e) { showToast('সমস্যা: ' + e.message, 'error'); }
}

function fillSettings() {
  var s = AState.settings || {};
  if ($('setMinWithdraw')) $('setMinWithdraw').value = s.minWithdraw || 50;
  if ($('setTaskDuration')) $('setTaskDuration').value = s.taskDuration || 30;
  if ($('setCooldown')) $('setCooldown').value = s.cooldownDuration || 60;
  if ($('setRequiredReferrals')) $('setRequiredReferrals').value = s.requiredReferrals || 0;
}

async function saveSettings() {
  var minWd = Number($('setMinWithdraw').value || 50);
  var td = Number($('setTaskDuration').value || 30);
  var cd = Number($('setCooldown').value || 60);
  var rr = Number($('setRequiredReferrals').value || 0);

  try {
    await db.ref('settings').update({
      minWithdraw: minWd,
      taskDuration: td,
      cooldownDuration: cd,
      requiredReferrals: rr
    });
    showToast('সেটিংস সেভ হয়েছে', 'success');
  } catch (e) { showToast('সমস্যা: ' + e.message, 'error'); }
}

/* ============================================================
   TAB SWITCH
   ============================================================ */
function switchTab(tab) {
  AState.currentTab = tab;
  $all('.admin-tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  $all('.admin-page').forEach(function (p) {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
}

/* ============================================================
   BIND EVENTS
   ============================================================ */
function bindAdminEvents() {
  $('btnAdminLogin').addEventListener('click', handleAdminLogin);
  $('btnAdminGoogle').addEventListener('click', handleAdminGoogle);
  $('btnAdminLogout').addEventListener('click', handleAdminLogout);

  $('adminPassword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleAdminLogin();
  });

  $all('.admin-tab').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });

  $all('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $all('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      AState.wdFilter = btn.dataset.filter;
      renderWithdrawals();
    });
  });

  $('userSearch').addEventListener('input', function (e) {
    AState.userSearch = e.target.value || '';
    renderUsers();
  });

  $('btnAddTask').addEventListener('click', function () { openTaskModal(null); });
  $('btnCancelTask').addEventListener('click', closeTaskModal);
  $('btnSaveTask').addEventListener('click', saveTask);

  $('btnSaveNotice').addEventListener('click', saveNotice);
  $('btnSaveSettings').addEventListener('click', saveSettings);
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
(function bootstrap() {
  document.addEventListener('DOMContentLoaded', function () {
    try {
      bindAdminEvents();
    } catch (e) { console.error('[Bootstrap]', e); }
  });

  setTimeout(function () {
    showScreen('admin-login');
    if (!auth || !db) {
      showError('adminLoginError', 'Firebase লোড হয়নি। রিফ্রেশ দিন।');
      return;
    }
    initAdminAuth();
  }, 1500);
})();
