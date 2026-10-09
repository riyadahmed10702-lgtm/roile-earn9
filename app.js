/* ============================================================
   Roile Earn9 — app.js
   ============================================================ */
'use strict';

/* Firebase Config */
const firebaseConfig = {
  apiKey: "AIzaSyDQPP8lIg90S2Z1MWImCx261hVb_A-TV0g",
  authDomain: "roile-earn9.firebaseapp.com",
  databaseURL: "https://roile-earn9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "roile-earn9",
  storageBucket: "roile-earn9.firebasestorage.app",
  messagingSenderId: "408337081103",
  appId: "1:408337081103:web:b722c9328e008f8963947a",
  measurementId: "G-THZD4G21NN"
};

let auth = null;
let db = null;
try {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();
  console.log('[Roile] Firebase initialized ✔');
} catch (e) {
  console.error('[Roile] Firebase init failed:', e);
  alert('Firebase লোড করতে সমস্যা হয়েছে। ইন্টারনেট চেক করে রিফ্রেশ দিন।');
}

/* Constants */
const APP_CONST = {
  taskDuration: 30,
  cooldown: 60,
  minWithdraw: 50,
  splash: 1800,
  cooldownKey: 'roile_cooldown_until',
  deviceKey: 'roile_device_id'
};

/* State */
const AppState = {
  user: null,
  profile: null,
  tasks: {},
  settings: { notice: '', minWithdraw: 50, taskDuration: 30, cooldownDuration: 60, requiredReferrals: 0 },
  isModerator: false,
  currentTask: null,
  timerInterval: null,
  currentTimerValue: 0,
  cdInterval: null,
  listeners: { profile: null, notice: null, tasks: null, history: null, modPanel: null, referral: null },
  historyTab: 'earnings',
  _withdrawals: {},
  linkOpened: false
};

/* Helpers */
function $(id) { return document.getElementById(id); }
function $all(sel) { return document.querySelectorAll(sel); }

function showScreen(id) {
  $all('.screen').forEach(function (s) { s.classList.remove('active'); });
  var el = $(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function navigateTo(pageName) {
  $all('.page').forEach(function (p) { p.classList.remove('active'); });
  var page = $('page-' + pageName);
  if (page) page.classList.add('active');
  $all('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  var nav = document.querySelector('.nav-item[data-nav="' + pageName + '"]');
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
  if (pageName === 'history') attachHistoryListeners();
  if (pageName === 'mod-panel' && AppState.isModerator) attachModPanelListener();
}

function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3200;
  var container = $('toastContainer');
  if (!container) return;
  var icons = { success: '✔', error: '✕', warning: '⚠', info: 'ℹ' };
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span><span class="toast-message">' + escapeHtml(message) + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('removing');
    setTimeout(function () { toast.remove(); }, 300);
  }, duration);
}

function showError(elementId, message, type) {
  type = type || 'error';
  var box = $(elementId);
  if (!box) return;
  box.className = 'error-box ' + type;
  box.textContent = message;
  box.classList.remove('hidden');
}

function clearError(elementId) {
  var box = $(elementId);
  if (!box) return;
  box.className = 'error-box hidden';
  box.textContent = '';
}

function showMsgBox(elementId, message, type) {
  showError(elementId, message, type || 'info');
}

function formatMoney(num) {
  var n = Number(num) || 0;
  return n.toFixed(2);
}

function formatDate(ts) {
  if (!ts) return '-';
  var d = new Date(ts);
  var months = ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];
  var day = d.getDate();
  var month = months[d.getMonth()];
  var year = d.getFullYear();
  var h = d.getHours();
  var m = String(d.getMinutes()).padStart(2, '0');
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return day + ' ' + month + ' ' + year + ', ' + h + ':' + m + ' ' + ampm;
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

function translateAuthError(code) {
  var map = {
    'auth/email-already-in-use': 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।',
    'auth/invalid-email': 'ইমেইলটি সঠিক নয়।',
    'auth/weak-password': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।',
    'auth/user-not-found': 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই।',
    'auth/wrong-password': 'পাসওয়ার্ড ভুল হয়েছে।',
    'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড ভুল।',
    'auth/invalid-login-credentials': 'ইমেইল বা পাসওয়ার্ড ভুল।',
    'auth/too-many-requests': 'অনেকবার ভুল হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    'auth/network-request-failed': 'ইন্টারনেট সংযোগ নেই। চেক করুন।',
    'auth/user-disabled': 'এই অ্যাকাউন্টটি বন্ধ করা হয়েছে।',
    'auth/operation-not-allowed': 'এই লগইন পদ্ধতি চালু নেই।',
    'auth/missing-password': 'পাসওয়ার্ড দিন।'
  };
  return map[code] || 'সমস্যা হয়েছে, আবার চেষ্টা করুন।';
}

function translateGoogleError(code) {
  var map = {
    'auth/popup-closed-by-user': 'গুগল লগইন বাতিল হয়েছে।',
    'auth/cancelled-popup-request': 'গুগল লগইন বাতিল হয়েছে।',
    'auth/popup-blocked': 'পপআপ ব্লক হয়েছে। ব্রাউজার সেটিং চেক করুন।',
    'auth/account-exists-with-different-credential': 'এই ইমেইলে অন্য পদ্ধতিতে অ্যাকাউন্ট আছে।',
    'auth/network-request-failed': 'ইন্টারনেট সমস্যা। আবার চেষ্টা করুন।',
    'auth/unauthorized-domain': 'এই ডোমেইন অনুমোদিত নয়। Firebase-এ যোগ করুন।',
    'auth/operation-not-supported-in-this-environment': 'এই ব্রাউজার/পরিবেশে গুগল লগইন সাপোর্ট করে না।',
    'auth/web-storage-unsupported': 'ব্রাউজার স্টোরেজ বন্ধ। কুকি/স্টোরেজ চালু করুন।',
    'auth/iframe-error': 'আইফ্রেম সমস্যা।',
    'auth/redirect-cancelled-by-user': 'রিডাইরেক্ট বাতিল হয়েছে।',
    'auth/internal-error': 'Firebase ইন্টারনাল এরর।'
  };
  var origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'unknown';
  var msg = map[code] || ('অজানা এরর');
  return msg + ' [code: ' + code + ', domain: ' + origin + ']';
}

/* Device ID */
/* ============================================================
   REFERRAL URL CAPTURE (Google Sign-up এর জন্য)
   ============================================================ */
function captureRefFromURL() {
  try {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) {
      ref = ref.trim().toUpperCase();
      localStorage.setItem('roile_pending_ref', ref);
      console.log('[Referral] Captured from URL:', ref);
    }
  } catch (e) { console.warn('[Referral] URL capture failed:', e); }
}

function getPendingRef() {
  var ref = localStorage.getItem('roile_pending_ref');
  return ref ? ref.trim().toUpperCase() : '';
}

function clearPendingRef() {
  localStorage.removeItem('roile_pending_ref');
}
function getOrCreateDeviceId() {
  var id = localStorage.getItem(APP_CONST.deviceKey);
  if (!id) {
    var rand = Math.random().toString(36).slice(2, 10);
    id = 'dev_' + Date.now().toString(36) + '_' + rand;
    localStorage.setItem(APP_CONST.deviceKey, id);
  }
  return id;
}

function isDeviceLocked(deviceId, currentUid) {
  return new Promise(function (resolve) {
    db.ref('devices/' + deviceId).once('value')
      .then(function (snap) {
        var data = snap.val();
        if (data && data.uid && data.uid !== currentUid) {
          resolve({ locked: true, uid: data.uid });
        } else {
          resolve({ locked: false });
        }
      })
      .catch(function (err) {
        console.warn('[Device] check failed:', err);
        resolve({ locked: false });
      });
  });
}

function detachAllListeners() {
  Object.keys(AppState.listeners).forEach(function (k) {
    var l = AppState.listeners[k];
    if (l && l.ref && typeof l.ref.off === 'function') {
      try { l.ref.off(l.event || 'value', l.cb); } catch (e) {}
    }
    AppState.listeners[k] = null;
  });
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }
  if (AppState.cdInterval) {
    clearInterval(AppState.cdInterval);
    AppState.cdInterval = null;
  }
}

/* ============================================================
   REFERRAL SYSTEM
   ============================================================ */

function generateReferralCode(email) {
  var base = (email || 'user').split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (base.length < 3) base = 'USER';
  var rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return base + '-' + rand;
}

function updateReferralUI(data) {
  if (!data) return;
  var codeEl = $('refCode');
  if (codeEl) codeEl.textContent = data.referralCode || '---';
  var countEl = $('refCount');
  if (countEl) countEl.textContent = data.referralCount || 0;
  var statusEl = $('refStatus');
  var subEl = $('refSubtitle');
  var required = (AppState.settings && AppState.settings.requiredReferrals) || 0;
  var unlocked = data.referralUnlocked || required === 0;
  if (statusEl) {
    if (unlocked) {
      statusEl.textContent = '✅ Unlocked';
      statusEl.className = 'ref-status unlocked';
    } else {
      statusEl.textContent = '🔒 ' + (data.referralCount || 0) + '/' + required;
      statusEl.className = 'ref-status locked';
    }
  }
  if (subEl) {
    if (required === 0) subEl.textContent = 'রেফারেল সিস্টেম চালু নেই';
    else if (unlocked) subEl.textContent = '✅ আপনি withdraw করতে পারবেন';
    else subEl.textContent = required + ' জন রেফার করলে আনলক হবে';
  }
}

function attachReferralListener() {
  if (!AppState.user) return;
  var myCode = AppState.profile && AppState.profile.referralCode;
  if (!myCode) return;
  if (AppState.listeners.referral && AppState.listeners.referral.ref) {
    try { AppState.listeners.referral.ref.off('value', AppState.listeners.referral.cb); } catch (e) {}
  }
  var ref = db.ref('referrals/' + myCode);
  var cb = function (snap) {
    var data = snap.val() || {};
    var count = Object.keys(data).length;
    updateReferralUI({
      referralCode: myCode,
      referralCount: count,
      referralUnlocked: AppState.profile ? AppState.profile.referralUnlocked : false
    });
    if (AppState.profile && (AppState.profile.referralCount || 0) !== count) {
      var updates = { referralCount: count };
      var required = (AppState.settings && AppState.settings.requiredReferrals) || 0;
      if (required > 0 && count >= required && !AppState.profile.referralUnlocked) {
        updates.referralUnlocked = true;
      }
      db.ref('users/' + AppState.user.uid).update(updates).catch(function () {});
    }
  };
  ref.on('value', cb);
  AppState.listeners.referral = { ref: ref, event: 'value', cb: cb };
   }
/* ============================================================
   AUTH — REGISTER
   ============================================================ */
async function handleRegister() {
  clearError('regError');
  var name = ($('regName').value || '').trim();
  var email = ($('regEmail').value || '').trim().toLowerCase();
  var phone = ($('regPhone').value || '').trim();
  var password = $('regPassword').value || '';

  if (name.length < 2) return showError('regError', 'সঠিক নাম দিন (কমপক্ষে ২ অক্ষর)।');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('regError', 'সঠিক ইমেইল দিন।');
  if (!/^01[3-9]\d{8}$/.test(phone)) return showError('regError', 'সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)।');
  if (password.length < 6) return showError('regError', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর।');

  var btn = $('btnRegister');
  btn.disabled = true;
  btn.textContent = 'অপেক্ষা করুন...';

  var createdUser = null;
  try {
    var cred = await auth.createUserWithEmailAndPassword(email, password);
    createdUser = cred.user;

    var deviceId = getOrCreateDeviceId();
    var lockInfo = await isDeviceLocked(deviceId, createdUser.uid);
    if (lockInfo.locked) {
      try { await createdUser.delete(); } catch (e) { console.warn(e); }
      await auth.signOut().catch(function () {});
      btn.disabled = false;
      btn.textContent = 'রেজিস্টার';
      return showError('regError', 'এই ডিভাইসে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।');
    }

    var now = Date.now();
    var myRefCode = generateReferralCode(email);
    var enteredRefCode = ($('regReferralCode') ? ($('regReferralCode').value || '').trim().toUpperCase() : '');
    var referrerUid = '';

    if (enteredRefCode) {
      try {
        var refSnap = await db.ref('users').orderByChild('referralCode').equalTo(enteredRefCode).once('value');
        var refData = refSnap.val();
        if (refData) {
          var refKeys = Object.keys(refData);
          for (var ri = 0; ri < refKeys.length; ri++) {
            if (refKeys[ri] !== createdUser.uid) {
              referrerUid = refKeys[ri];
              break;
            }
          }
        }
      } catch (e) { console.warn('[Referral] lookup failed:', e); }
    }

    await db.ref('users/' + createdUser.uid).set({
      name: name,
      email: email,
      phone: phone,
      deviceId: deviceId,
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      banned: false,
      role: 'user',
      provider: 'password',
  referralCode: myRefCode,
  referralCount: 0,
  referralUnlocked: false,
  referredBy: referrerUid || '',
  referralAsked: true,
  createdAt: now,
  lastLogin: now
});

    await db.ref('devices/' + deviceId).set({
      uid: createdUser.uid,
      createdAt: now
    });

    if (referrerUid) {
      var referrerCodeSnap = await db.ref('users/' + referrerUid + '/referralCode').once('value');
      var referrerCode = referrerCodeSnap.val();
      if (referrerCode) {
        await db.ref('referrals/' + referrerCode + '/' + createdUser.uid).set({
          uid: createdUser.uid,
          name: name,
          email: email,
          timestamp: now
        });
      }
    }

    try { await createdUser.updateProfile({ displayName: name }); } catch (e) {}

    showToast('রেজিস্ট্রেশন সফল! স্বাগতম।', 'success');
  } catch (err) {
    console.error('[Register]', err);
    btn.disabled = false;
    btn.textContent = 'রেজিস্টার';
    showError('regError', translateAuthError(err.code));
    if (createdUser && auth.currentUser && auth.currentUser.uid === createdUser.uid) {
      try {
        var snap = await db.ref('users/' + createdUser.uid).once('value');
        if (!snap.exists()) await createdUser.delete();
      } catch (e) {}
    }
  }
}

/* ============================================================
   AUTH — LOGIN
   ============================================================ */
async function handleLogin() {
  clearError('loginError');
  var email = ($('loginEmail').value || '').trim().toLowerCase();
  var password = $('loginPassword').value || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('loginError', 'সঠিক ইমেইল দিন।');
  if (!password) return showError('loginError', 'পাসওয়ার্ড দিন।');

  var btn = $('btnLogin');
  btn.disabled = true;
  btn.textContent = 'অপেক্ষা করুন...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    console.error('[Login]', err);
    showError('loginError', translateAuthError(err.code));
    btn.disabled = false;
    btn.textContent = 'লগইন';
  }
}

/* ============================================================
   AUTH — GOOGLE
   ============================================================ */
async function handleGoogleAuth() {
  clearError('loginError');
  clearError('regError');

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('[GoogleAuth]', err);
    var msg = translateGoogleError(err.code);
    if ($('screen-login').classList.contains('active')) showError('loginError', msg);
    else showError('regError', msg);
    showToast(msg, 'error');
  }
}

/* ============================================================
   AUTH — LOGOUT
   ============================================================ */
/* ============================================================
   REFERRAL PROMPT (Google Signup-এর জন্য)
   ============================================================ */
function showReferralPrompt() {
  var modal = $('referralPromptModal');
  if (modal) modal.classList.remove('hidden');
}

function hideReferralPrompt() {
  var modal = $('referralPromptModal');
  if (modal) modal.classList.add('hidden');
}

async function applyReferralFromPrompt() {
  var code = ($('promptRefCode').value || '').trim().toUpperCase();
  var msg = $('promptRefMsg');
  if (!code) {
    msg.className = 'error-box error';
    msg.textContent = 'কোড দিন অথবা Skip চাপুন।';
    msg.classList.remove('hidden');
    return;
  }
  if (!AppState.user) return;

  var btn = $('btnApplyRef');
  btn.disabled = true;
  btn.textContent = 'চেক করা হচ্ছে...';

  try {
    var refSnap = await db.ref('users').orderByChild('referralCode').equalTo(code).once('value');
    var refData = refSnap.val();
    if (!refData) {
      msg.className = 'error-box error';
      msg.textContent = '❌ কোডটি সঠিক নয়।';
      msg.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Apply';
      return;
    }
    var refKeys = Object.keys(refData);
    var referrerUid = '';
    for (var i = 0; i < refKeys.length; i++) {
      if (refKeys[i] !== AppState.user.uid) {
        referrerUid = refKeys[i];
        break;
      }
    }
    if (!referrerUid) {
      msg.className = 'error-box error';
      msg.textContent = '❌ নিজের কোড ব্যবহার করা যাবে না।';
      msg.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Apply';
      return;
    }

    // Apply referral
    await db.ref('users/' + AppState.user.uid).update({
      referredBy: referrerUid,
      referralAsked: true
    });
    await db.ref('referrals/' + code + '/' + AppState.user.uid).set({
      uid: AppState.user.uid,
      name: (AppState.profile && AppState.profile.name) || '',
      email: (AppState.profile && AppState.profile.email) || '',
      timestamp: Date.now()
    });

    showToast('🎉 Referral সফলভাবে যোগ হয়েছে!', 'success');
    hideReferralPrompt();
  } catch (e) {
    console.error('[ReferralPrompt]', e);
    msg.className = 'error-box error';
    msg.textContent = 'সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    msg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Apply';
  }
}

async function skipReferralPrompt() {
  if (!AppState.user) return;
  try {
    await db.ref('users/' + AppState.user.uid + '/referralAsked').set(true);
  } catch (e) { console.warn(e); }
  hideReferralPrompt();
      }
async function handleLogout() {
  if (!confirm('আপনি কি লগআউট করতে চান?')) return;
  try {
    detachAllListeners();
    localStorage.removeItem(APP_CONST.cooldownKey);
    await auth.signOut();
    showToast('লগআউট হয়েছে', 'info');
  } catch (err) {
    console.error('[Logout]', err);
    showToast('লগআউটে সমস্যা হয়েছে', 'error');
  }
}

/* ============================================================
   ENSURE PROFILE
   ============================================================ */
async function ensureProfile(user) {
  var ref = db.ref('users/' + user.uid);
  var snap = null;
  try { snap = await ref.once('value'); } catch (e) { console.warn('profile read fail:', e); }
  
  // প্রোফাইল আগে থেকেই আছে — কিন্তু referralCode নেই?
  if (snap && snap.exists()) {
    var existingData = snap.val() || {};
    if (!existingData.referralCode) {
      // পুরোনো ইউজার — অটো code বানিয়ে সেভ করি
      var newCode = generateReferralCode(existingData.email || user.email || '');
      await db.ref('users/' + user.uid).update({
        referralCode: newCode,
        referralCount: existingData.referralCount || 0,
        referralUnlocked: existingData.referralUnlocked || false,
        referredBy: existingData.referredBy || ''
      });
      console.log('[Referral] Old user code generated:', newCode);
    }
    return;
}

var deviceId = getOrCreateDeviceId();
var now = Date.now();
var myRefCode = generateReferralCode(user.email || '');

// ✅ URL থেকে captured referral code
var pendingRef = getPendingRef();
var referrerUid = '';

if (pendingRef) {
  try {
    var refSnap = await db.ref('users').orderByChild('referralCode').equalTo(pendingRef).once('value');
    var refData = refSnap.val();
    if (refData) {
      var refKeys = Object.keys(refData);
      for (var ri = 0; ri < refKeys.length; ri++) {
        if (refKeys[ri] !== user.uid) {
          referrerUid = refKeys[ri];
          break;
        }
      }
    }
  } catch (e) { console.warn('[Referral] lookup failed:', e); }
}

var profile = {
  name: user.displayName || (user.email ? user.email.split('@')[0] : 'ব্যবহারকারী'),
  email: user.email || '',
  phone: '',
  deviceId: deviceId,
  balance: 0,
  totalEarned: 0,
  totalWithdrawn: 0,
  banned: false,
  role: 'user',
  provider: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'google.com',
  referralCode: myRefCode,
  referralCount: 0,
  referralUnlocked: false,
  referredBy: referrerUid || '',
  referralAsked: referrerUid ? true : false,
  createdAt: now,
  lastLogin: now
};
    try {
    await ref.set(profile);
    await db.ref('devices/' + deviceId).set({ uid: user.uid, createdAt: now });

    // ✅ Referrer-এর কাছে entry যোগ করি
    if (referrerUid) {
      var referrerCodeSnap = await db.ref('users/' + referrerUid + '/referralCode').once('value');
      var referrerCode = referrerCodeSnap.val();
      if (referrerCode) {
        await db.ref('referrals/' + referrerCode + '/' + user.uid).set({
          uid: user.uid,
          name: profile.name,
          email: profile.email,
          timestamp: now
        });
      }
      clearPendingRef();
      showToast('🎉 Referral সফলভাবে যোগ হয়েছে!', 'success');
    } else {
      showToast('স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে।', 'success');
    }
  } catch (e) {
    console.error('[ensureProfile]', e);
  }
     }
/* ============================================================
   REDIRECT RESULT
   ============================================================ */
function handleRedirectResult() {
  auth.getRedirectResult().then(function (result) {
    if (result && result.user) {
      console.log('[Redirect] Google sign-in success');
      showToast('গুগল লগইন সফল', 'success');
    }
  }).catch(function (err) {
    console.error('[RedirectResult]', err);
    if (err && err.code) showToast(translateGoogleError(err.code), 'error');
  });
}

/* ============================================================
   AUTH STATE LISTENER
   ============================================================ */
/* ============================================================
   VPN / PROXY DETECTION (Ultra Strong — 6 Layer)
   ============================================================ */
function getWebRTCIPs() {
  return new Promise(function (resolve) {
    var ips = [];
    try {
      var pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pc.createDataChannel('');
      pc.onicecandidate = function (e) {
        if (e.candidate && e.candidate.candidate) {
          var parts = e.candidate.candidate.split(' ');
          if (parts[4]) {
            var ip = parts[4];
            var isPrivate = ip.indexOf('192.168.') === 0 || ip.indexOf('10.') === 0 ||
                            ip.indexOf('172.') === 0 || ip.indexOf('127.') === 0 || ip.indexOf('::') > -1;
            if (!isPrivate && ips.indexOf(ip) === -1) ips.push(ip);
          }
        }
      };
      setTimeout(function () {
        try { pc.close(); } catch (e) {}
        resolve(ips);
      }, 1500);
    } catch (e) {
      resolve([]);
    }
  });
}

async function checkVPN() {
  var result = { vpn: false, layer: null, ip: null, country: null };

  var ipData1 = null;

  // ✅ Layer 1: ipwho.is — শুধু strong signals
  try {
    ipData1 = await fetch('https://ipwho.is/').then(function (r) { return r.json(); });
    result.ip = ipData1.ip;
    result.country = ipData1.country;

    if (ipData1.security) {
      if (ipData1.security.vpn === true) {
        return { vpn: true, layer: 'ipwho-vpn', ip: ipData1.ip, country: ipData1.country };
      }
      if (ipData1.security.proxy === true) {
        return { vpn: true, layer: 'ipwho-proxy', ip: ipData1.ip, country: ipData1.country };
      }
      if (ipData1.security.tor === true) {
        return { vpn: true, layer: 'ipwho-tor', ip: ipData1.ip, country: ipData1.country };
      }
    }
  } catch (e) { console.warn('[VPN L1]', e); }

  if (!result.ip) return result;

  // ✅ Layer 2: proxycheck.io — শুধু type VPN/TOR নিশ্চিত
  try {
    var r2 = await fetch('https://proxycheck.io/v2/' + result.ip + '?vpn=1&asn=1&risk=1').then(function (r) { return r.json(); });
    if (r2 && r2[result.ip]) {
      var d = r2[result.ip];
      // শুধু type VPN বা TOR চাই, নাহলে risk 85+
      if (d.type === 'VPN' || d.type === 'TOR') {
        return { vpn: true, layer: 'proxycheck-' + d.type.toLowerCase(), ip: result.ip, country: result.country };
      }
      if (d.proxy === 'yes' && d.risk && Number(d.risk) >= 85) {
        return { vpn: true, layer: 'proxycheck-risk', ip: result.ip, country: result.country };
      }
    }
} catch (e) { console.warn('[VPN L2]', e); }

  return result;
}

function initAuthListener() {
  auth.onAuthStateChanged(async function (user) {
    console.log('[Auth] state:', user ? user.uid : 'signed out');

    if (!user) {
      AppState.user = null;
      AppState.profile = null;
      AppState.isModerator = false;
      detachAllListeners();
      $('navModPanel').classList.add('hidden');
      showScreen('screen-login');
      return;
    }

    AppState.user = user; 
    await ensureProfile(user);

    var prof = null;
    try {
      var profSnap = await db.ref('users/' + user.uid).once('value');
      prof = profSnap.val();
    } catch (e) { console.warn(e); }

    if (prof && prof.banned === true) {
      alert('আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে। সহায়তার জন্য যোগাযোগ করুন।');
      detachAllListeners();
      await auth.signOut();
      return;
    }

    var deviceId = prof && prof.deviceId ? prof.deviceId : getOrCreateDeviceId();
    db.ref('devices/' + deviceId).once('value').then(function (s) {
      var cur = s.val();
      if (!cur || !cur.uid) {
        db.ref('devices/' + deviceId).set({ uid: user.uid, createdAt: Date.now() }).catch(function () {});
      }
    }).catch(function () {});

    db.ref('users/' + user.uid + '/lastLogin').set(Date.now()).catch(function () {});

    attachProfileListener();
    attachNoticeListener();
    attachTasksListener();

showScreen('screen-app');
    navigateTo('dashboard');

    // ✅ VPN চেক (সর্বোচ্চ লেয়ার)
    checkVPN().then(function (vres) {
      if (vres.vpn) {
        var layerText = {
          'ipwho-security': 'VPN / Proxy / Tor শনাক্ত',
          'ipwho-hosting': 'Datacenter IP শনাক্ত',
          'proxycheck': 'উন্নত Proxy/VPN শনাক্ত',
          'webrtc-leak': 'WebRTC IP Leak শনাক্ত',
          'timezone': 'Timezone মিলছে না',
          'ip-mismatch': 'দুই IP মিলছে না'
        };
        var msg = layerText[vres.layer] || 'সন্দেহজনক সংযোগ';

        alert('🚫 ' + msg + '!\n\nRoile Earn9 ব্যবহার করতে হলে VPN / Proxy সম্পূর্ণ বন্ধ করে আবার চেষ্টা করুন।');

        // Admin Panel-এর জন্য log
        if (AppState.user) {
          db.ref('vpnDetections/' + AppState.user.uid).push({
            layer: vres.layer,
            ip: vres.ip || '',
            realIP: vres.realIP || '',
            country: vres.country || '',
            timestamp: Date.now(),
            userAgent: navigator.userAgent || ''
          }).catch(function () {});
        }

        detachAllListeners();
        auth.signOut();
      } else {
        console.log('[VPN] ✓ Clean. IP:', vres.ip, '| Country:', vres.country);
      }
    });
  });
       }

/* ============================================================
   PROFILE LISTENER
   ============================================================ */
function attachProfileListener() {
  if (!AppState.user) return;
  if (AppState.listeners.profile && AppState.listeners.profile.ref) {
    try { AppState.listeners.profile.ref.off('value', AppState.listeners.profile.cb); } catch (e) {}
  }

  var ref = db.ref('users/' + AppState.user.uid);
  var cb = function (snap) {
    var data = snap.val();
    if (!data) return;
    AppState.profile = data;

    if (data.banned === true) {
      alert('আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে।');
      detachAllListeners();
      auth.signOut();
      return;
    }

    $('headerName').textContent = data.name || 'ব্যবহারকারী';
    $('headerStatus').textContent = data.role === 'admin' ? 'অ্যাডমিন' : (data.role === 'moderator' ? 'মডারেটর' : 'সক্রিয়');
    $('dashBalance').textContent = formatMoney(data.balance);
    $('dashTotalEarned').textContent = '৳' + formatMoney(data.totalEarned);
    $('dashTotalWithdrawn').textContent = '৳' + formatMoney(data.totalWithdrawn);
    $('dashEmail').textContent = data.email || '-';
    $('dashPhone').textContent = data.phone || '-';
    $('dashRole').textContent = data.role === 'admin' ? 'অ্যাডমিন' : (data.role === 'moderator' ? 'মডারেটর' : 'ব্যবহারকারী');
    $('wdBalance').textContent = formatMoney(data.balance);

    updateReferralUI(data);
    attachReferralListener();

    if (AppState.historyTab === 'earnings') renderHistory();
  };

  ref.on('value', cb);
  AppState.listeners.profile = { ref: ref, event: 'value', cb: cb };
}

/* ============================================================
   NOTICE LISTENER
   ============================================================ */
function attachNoticeListener() {
  if (AppState.listeners.notice && AppState.listeners.notice.ref) {
    try { AppState.listeners.notice.ref.off('value', AppState.listeners.notice.cb); } catch (e) {}
  }

  var ref = db.ref('settings');
  var cb = function (snap) {
    var s = snap.val() || {};
    AppState.settings = {
      notice: s.notice || 'স্বাগতম! টাস্ক সম্পন্ন করে আয় শুরু করুন।',
      minWithdraw: typeof s.minWithdraw === 'number' ? s.minWithdraw : 50,
      taskDuration: typeof s.taskDuration === 'number' ? s.taskDuration : 30,
      cooldownDuration: typeof s.cooldownDuration === 'number' ? s.cooldownDuration : 60,
      requiredReferrals: typeof s.requiredReferrals === 'number' ? s.requiredReferrals : 0
    };
    $('dashNotice').textContent = AppState.settings.notice;
    updateReferralUI(AppState.profile || {});
  };

  ref.on('value', cb);
  AppState.listeners.notice = { ref: ref, event: 'value', cb: cb };
}

/* ============================================================
   TASKS LISTENER + RENDER
   ============================================================ */
function attachTasksListener() {
  if (AppState.listeners.tasks && AppState.listeners.tasks.ref) {
    try { AppState.listeners.tasks.ref.off('value', AppState.listeners.tasks.cb); } catch (e) {}
  }

  var ref = db.ref('tasks');
  var cb = function (snap) {
    AppState.tasks = snap.val() || {};
    renderTasks();
  };

  ref.on('value', cb);
  AppState.listeners.tasks = { ref: ref, event: 'value', cb: cb };
}

function renderTasks() {
  var list = $('tasksList');
  var tasks = AppState.tasks || {};
  var ids = Object.keys(tasks).filter(function (id) { return tasks[id] && tasks[id].active === true; });

  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>এই মুহূর্তে কোনো টাস্ক নেই। পরে আবার চেক করুন।</p></div>';
    return;
  }

  list.innerHTML = ids.map(function (id) {
    var t = tasks[id];
    return '<div class="task-item" data-task-id="' + escapeHtml(id) + '">' +
      '<div class="task-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>' +
      '<div class="task-info">' +
        '<div class="task-title">' + escapeHtml(t.title || 'টাস্ক') + '</div>' +
        '<div class="task-desc">' + escapeHtml(t.desc || '') + '</div>' +
      '</div>' +
      '<div class="task-reward">৳' + formatMoney(t.reward) + '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.task-item').forEach(function (el) {
    el.addEventListener('click', function () { openTaskViewer(el.dataset.taskId); });
  });
}

/* ============================================================
   TASK VIEWER + TIMER
   ============================================================ */
function openTaskViewer(taskId) {
  var t = AppState.tasks[taskId];
  if (!t) return showToast('টাস্ক খুঁজে পাওয়া যায়নি', 'error');

  var cdLeft = getCooldownRemaining();
  if (cdLeft > 0) {
    showCooldownOverlay(cdLeft);
    return;
  }

  AppState.currentTask = { id: taskId, title: t.title, desc: t.desc, link: t.link, reward: t.reward };
  AppState.linkOpened = false;
  $('viewerTitle').textContent = t.title || 'টাস্ক';
  $('viewerDesc').textContent = t.desc || '';
  $('btnClaim').disabled = true;
  navigateTo('task-viewer');
  startTaskTimer();
}

function startTaskTimer() {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);

  var duration = AppState.settings.taskDuration || APP_CONST.taskDuration;
  AppState.currentTimerValue = duration;

  var circle = $('timerProgress');
  var number = $('timerNumber');
  var circumference = 2 * Math.PI * 52;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = 0;
  number.textContent = duration;

  AppState.timerInterval = setInterval(function () {
    AppState.currentTimerValue -= 1;
    var val = AppState.currentTimerValue;
    number.textContent = val > 0 ? val : 0;
    var progress = (duration - val) / duration;
    circle.style.strokeDashoffset = circumference * progress;

    if (val <= 5) circle.style.stroke = '#ef4444';
    else if (val <= 15) circle.style.stroke = '#f59e0b';
    else circle.style.stroke = '#22c55e';

    if (val <= 0) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
      $('btnClaim').disabled = false;
      showToast('টাইমার শেষ! এখন রিওয়ার্ড ক্লেইম করুন।', 'success');
    }
  }, 1000);
}

/* ============================================================
   CLAIM REWARD
   ============================================================ */
async function handleClaimReward() {
  var btn = $('btnClaim');
  if (btn.disabled) return;
  if (!AppState.currentTask || !AppState.user || !AppState.profile) return;

  if (!AppState.linkOpened) {
    showToast('প্রথমে "টাস্ক ওপেন করুন" বাটনে ক্লিক করুন।', 'warning');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'প্রসেস হচ্ছে...';

  var task = AppState.currentTask;
  var reward = Number(task.reward) || 0;
  var uid = AppState.user.uid;
  var now = Date.now();

  try {
    var profileRef = db.ref('users/' + uid);
    var snap = await profileRef.once('value');
    var p = snap.val() || {};
    var newBalance = (Number(p.balance) || 0) + reward;
    var newTotalEarned = (Number(p.totalEarned) || 0) + reward;

    await profileRef.update({ balance: newBalance, totalEarned: newTotalEarned });
    await db.ref('users/' + uid + '/earnings/' + now).set({
      taskId: task.id,
      taskName: task.title || 'টাস্ক',
      amount: reward,
      timestamp: now
    });

    setCooldown(AppState.settings.cooldownDuration || APP_CONST.cooldown);
    showToast('৳' + formatMoney(reward) + ' আয় হয়েছে!', 'success');
    AppState.currentTask = null;
    navigateTo('tasks');
  } catch (err) {
    console.error('[Claim]', err);
    showToast('ক্লেইম করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    btn.disabled = false;
  } finally {
    btn.textContent = 'রিওয়ার্ড ক্লেইম করুন';
  }
}

/* ============================================================
   COOLDOWN
   ============================================================ */
function setCooldown(seconds) {
  var until = Date.now() + (seconds * 1000);
  if (AppState.user) {
    db.ref('users/' + AppState.user.uid + '/cooldownUntil').set(until).catch(function(){});
  }
  localStorage.setItem(APP_CONST.cooldownKey, String(until));
}

function getCooldownRemaining() {
  var fromDb = (AppState.profile && AppState.profile.cooldownUntil) || 0;
  var fromLocal = Number(localStorage.getItem(APP_CONST.cooldownKey) || 0);
  var until = Math.max(fromDb, fromLocal);
  if (!until) return 0;
  var left = Math.ceil((until - Date.now()) / 1000);
  return left > 0 ? left : 0;
}

function showCooldownOverlay(seconds) {
  var overlay = $('cooldownOverlay');
  var num = $('cdNumber');
  var circle = $('cdProgress');
  var duration = seconds;
  var circumference = 2 * Math.PI * 42;

  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = 0;
  num.textContent = seconds;
  overlay.classList.remove('hidden');

  if (AppState.cdInterval) clearInterval(AppState.cdInterval);

  var left = seconds;
  AppState.cdInterval = setInterval(function () {
    left -= 1;
    if (left <= 0) {
      clearInterval(AppState.cdInterval);
      AppState.cdInterval = null;
      overlay.classList.add('hidden');
      return;
    }
    num.textContent = left;
    var progress = (duration - left) / duration;
    circle.style.strokeDashoffset = circumference * progress;
  }, 1000);
}

/* ============================================================
   AUTO ASSIGN MODERATOR
   ============================================================ */
async function autoAssignModerator() {
  try {
    var snap = await db.ref('moderators').once('value');
    var mods = snap.val() || {};
    var ids = Object.keys(mods).filter(function (uid) { return mods[uid] && mods[uid].active !== false; });
    if (ids.length === 0) return null;

    var best = null;
    ids.forEach(function (uid) {
      var m = mods[uid];
      var pc = Number(m.pendingCount) || 0;
      if (best === null || pc < best.pendingCount) {
        best = { uid: uid, pendingCount: pc, name: m.name || 'মডারেটর', email: m.email || '' };
      }
    });
    return best;
  } catch (err) {
    console.error('[autoAssignModerator]', err);
    return null;
  }
}

/* ============================================================
   WITHDRAW
   ============================================================ */
async function handleWithdraw() {
  clearError('wdMessage');
  var uid = AppState.user ? AppState.user.uid : null;
  if (!uid || !AppState.profile) return showError('wdMessage', 'লগইন নেই।');

  var active = document.querySelector('.method-btn.active');
  var method = active ? active.dataset.method : 'bkash';
  var number = ($('wdNumber').value || '').trim();
  var amount = Number($('wdAmount').value || 0);
  var minWd = AppState.settings.minWithdraw || APP_CONST.minWithdraw;
  var balance = Number(AppState.profile.balance) || 0;

  if (!/^01[3-9]\d{8}$/.test(number)) return showError('wdMessage', 'সঠিক বাংলাদেশি নম্বর দিন।');
  if (!amount || amount < minWd) return showError('wdMessage', 'নূন্যতম ৳' + minWd + ' উত্তোলন করা যাবে।');
  if (amount > balance) return showError('wdMessage', 'পর্যাপ্ত ব্যালেন্স নেই।');

  var requiredRefs = AppState.settings.requiredReferrals || 0;
  var unlocked = AppState.profile.referralUnlocked || requiredRefs === 0;
  if (!unlocked) {
    var have = AppState.profile.referralCount || 0;
    return showError('wdMessage', 'Withdraw এর জন্য ' + requiredRefs + ' জনকে রেফার করতে হবে। আপনি করেছেন: ' + have + '/' + requiredRefs);
  }

  var btn = $('btnWithdraw');
  btn.disabled = true;
  btn.textContent = 'পাঠানো হচ্ছে...';

  try {
    var myWdSnap = await db.ref('withdrawals').orderByChild('uid').equalTo(uid).once('value');
    var myWds = myWdSnap.val() || {};
    var hasPending = Object.keys(myWds).some(function (k) { return myWds[k] && myWds[k].status === 'pending'; });
    if (hasPending) {
      btn.disabled = false;
      btn.textContent = 'রিকোয়েস্ট পাঠান';
      return showError('wdMessage', 'আপনার একটি pending রিকোয়েস্ট আছে। আগে সেটি সম্পন্ন হোক।');
    }

    var mod = await autoAssignModerator();
    if (!mod) {
      btn.disabled = false;
      btn.textContent = 'রিকোয়েস্ট পাঠান';
      return showError('wdMessage', 'এই মুহূর্তে কোনো মডারেটর নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }

    var now = Date.now();
    var wdRef = db.ref('withdrawals').push();
    var wdId = wdRef.key;
    var newBalance = balance - amount;

    var updates = {};
    updates['users/' + uid + '/balance'] = newBalance;
    updates['withdrawals/' + wdId] = {
      uid: uid,
      userName: AppState.profile.name || 'ব্যবহারকারী',
      userEmail: AppState.profile.email || '',
      userPhone: AppState.profile.phone || '',
      method: method,
      number: number,
      amount: amount,
      status: 'pending',
      assignedMod: mod.uid,
      assignedModName: mod.name,
      timestamp: now
    };

var pcSnap = await db.ref('moderators/' + mod.uid + '/pendingCount').once('value');
var currentPc = Number(pcSnap.val()) || 0;
updates['moderators/' + mod.uid + '/pendingCount'] = currentPc + 1;

await db.ref().update(updates);

    showToast('উইথড্র রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!', 'success');
    $('wdNumber').value = '';
    $('wdAmount').value = '';
    navigateTo('history');
  } catch (err) {
    console.error('[Withdraw]', err);
    showError('wdMessage', 'রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
  } finally {
    btn.disabled = false;
    btn.textContent = 'রিকোয়েস্ট পাঠান';
  }
                   }
/* ============================================================
   HISTORY
   ============================================================ */
function attachHistoryListeners() {
  if (!AppState.user) return;
  var uid = AppState.user.uid;

  if (AppState.listeners.history && AppState.listeners.history.ref) {
    try { AppState.listeners.history.ref.off('value', AppState.listeners.history.cb); } catch (e) {}
  }

  var ref = db.ref('withdrawals').orderByChild('uid').equalTo(uid);
  var cb = function (snap) {
    var data = snap.val() || {};
    var withIds = {};
    Object.keys(data).forEach(function (k) {
      if (data[k]) withIds[k] = Object.assign({}, data[k], { _id: k });
    });
    AppState._withdrawals = withIds;
    if (AppState.historyTab === 'withdrawals') renderHistory();
  };
  ref.on('value', cb);
  AppState.listeners.history = { ref: ref, event: 'value', cb: cb };
  renderHistory();
}

function renderHistory() {
  var list = $('historyList');
  var tab = AppState.historyTab;

  if (tab === 'earnings') {
    var earnings = (AppState.profile && AppState.profile.earnings) || {};
    var items = Object.keys(earnings).map(function (k) { return earnings[k]; })
      .filter(function (x) { return x; })
      .sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>এখনো কোনো আয় হয়নি।</p></div>';
      return;
    }

    list.innerHTML = items.map(function (e) {
      return '<div class="history-item">' +
        '<div class="history-icon earn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>' +
        '<div class="history-info">' +
          '<div class="history-title">' + escapeHtml(e.taskName || 'টাস্ক') + '</div>' +
          '<div class="history-date">' + formatDate(e.timestamp) + '</div>' +
        '</div>' +
        '<div class="history-amount positive">+৳' + formatMoney(e.amount) + '</div>' +
      '</div>';
    }).join('');
  } else {
    var wds = AppState._withdrawals || {};
    var items2 = Object.keys(wds).map(function (k) { return wds[k]; })
      .filter(function (x) { return x; })
      .sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    if (items2.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>এখনো কোনো উইথড্র রিকোয়েস্ট নেই।</p></div>';
      return;
    }

    list.innerHTML = items2.map(function (w) {
      var statusClass = w.status === 'approved' ? 'status-approved' : (w.status === 'rejected' ? 'status-rejected' : 'status-pending');
      var statusText = w.status === 'approved' ? 'অনুমোদিত' : (w.status === 'rejected' ? 'বাতিল' : 'অপেক্ষমাণ');
      var methodText = w.method === 'bkash' ? 'বিকাশ' : 'নগদ';
      return '<div class="history-item">' +
        '<div class="history-icon wd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></div>' +
        '<div class="history-info">' +
          '<div class="history-title">' + methodText + ' • ' + escapeHtml(w.number || '') + '</div>' +
          '<div class="history-date">' + formatDate(w.timestamp) + '</div>' +
          '<span class="status-badge ' + statusClass + '">' + statusText + '</span>' +
        '</div>' +
        '<div class="history-amount negative">-৳' + formatMoney(w.amount) + '</div>' +
      '</div>';
    }).join('');
  }
}

/* ============================================================
   MOD PANEL
   ============================================================ */
function checkModeratorStatus() {
  if (!AppState.user) return;
  var uid = AppState.user.uid;
  db.ref('moderators/' + uid).once('value').then(function (snap) {
    var data = snap.val();
    if (data && data.active !== false) {
      AppState.isModerator = true;
      $('navModPanel').classList.remove('hidden');
    } else {
      AppState.isModerator = false;
      $('navModPanel').classList.add('hidden');
    }
  }).catch(function (err) { console.warn('[ModCheck]', err); });
}

function attachModPanelListener() {
  if (!AppState.user || !AppState.isModerator) return;
  var uid = AppState.user.uid;

  if (AppState.listeners.modPanel && AppState.listeners.modPanel.ref) {
    try { AppState.listeners.modPanel.ref.off('value', AppState.listeners.modPanel.cb); } catch (e) {}
  }

  var ref = db.ref('withdrawals').orderByChild('assignedMod').equalTo(uid);
  var cb = function (snap) {
    var data = snap.val() || {};
    var items = Object.keys(data).map(function (k) {
      return Object.assign({}, data[k], { _id: k });
    }).filter(function (w) { return w && w.status === 'pending'; })
      .sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
    renderModPanel(items);
  };
  ref.on('value', cb);
  AppState.listeners.modPanel = { ref: ref, event: 'value', cb: cb };
}

function renderModPanel(items) {
  var list = $('modList');
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>আপনার কাছে কোনো pending রিকোয়েস্ট নেই।</p></div>';
    return;
  }

  list.innerHTML = items.map(function (w) {
    var methodText = w.method === 'bkash' ? 'বিকাশ' : 'নগদ';
    return '<div class="mod-item">' +
      '<div class="mod-item-head">' +
        '<div class="mod-user">' +
          '<span class="mod-user-name">' + escapeHtml(w.userName || 'ব্যবহারকারী') + '</span>' +
          '<span class="mod-user-contact">' + escapeHtml(w.userEmail || '') + '</span>' +
        '</div>' +
        '<div class="mod-amount">৳' + formatMoney(w.amount) + '</div>' +
      '</div>' +
      '<div class="mod-details">' +
        '<div class="mod-detail-row"><span>মেথড</span><span>' + methodText + '</span></div>' +
        '<div class="mod-detail-row"><span>নম্বর</span><span>' + escapeHtml(w.number || '') + '</span></div>' +
        '<div class="mod-detail-row"><span>সময়</span><span>' + formatDate(w.timestamp) + '</span></div>' +
      '</div>' +
      '<div class="mod-actions">' +
        '<button class="btn btn-success" data-action="approve" data-id="' + escapeHtml(w._id) + '">অনুমোদন</button>' +
        '<button class="btn btn-danger" data-action="reject" data-id="' + escapeHtml(w._id) + '">বাতিল</button>' +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('button[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.dataset.id;
      if (btn.dataset.action === 'approve') handleModApprove(id);
      else handleModReject(id);
    });
  });
}

async function handleModApprove(wdId) {
  if (!confirm('এই রিকোয়েস্ট অনুমোদন করবেন?')) return;
  if (!AppState.user) return;
try {
  var wdSnap = await db.ref('withdrawals/' + wdId).once('value');
  var wd = wdSnap.val();
  if (!wd || wd.status !== 'pending') return showToast('রিকোয়েস্টটি আর pending নেই।', 'warning');
  if (wd.assignedMod !== AppState.user.uid) return showToast('এটি আপনার assigned নয়।', 'error');

  var now = Date.now();
  var uSnap = await db.ref('users/' + wd.uid).once('value');
  var u = uSnap.val() || {};
  var newTotalWithdrawn = (Number(u.totalWithdrawn) || 0) + (Number(wd.amount) || 0);

  var pcSnap = await db.ref('moderators/' + AppState.user.uid + '/pendingCount').once('value');
  var currentPc = Number(pcSnap.val()) || 0;

  var updates = {};
  updates['withdrawals/' + wdId + '/status'] = 'approved';
  updates['withdrawals/' + wdId + '/approvedBy'] = AppState.user.uid;
  updates['withdrawals/' + wdId + '/approvedAt'] = now;
  updates['users/' + wd.uid + '/totalWithdrawn'] = newTotalWithdrawn;
  updates['moderators/' + AppState.user.uid + '/pendingCount'] = Math.max(0, currentPc - 1);

  await db.ref().update(updates);

  showToast('রিকোয়েস্ট অনুমোদিত হয়েছে', 'success');
} catch (err) {
  console.error('[ModApprove]', err);
  showToast('অনুমোদনে সমস্যা', 'error');
     }
}

async function handleModReject(wdId) {
  var reason = prompt('বাতিলের কারণ লিখুন (ঐচ্ছিক):', '');
  if (reason === null) return;
  if (!AppState.user) return;

  try {
  var wdSnap = await db.ref('withdrawals/' + wdId).once('value');
  var wd = wdSnap.val();
  if (!wd || wd.status !== 'pending') return showToast('রিকোয়েস্টটি আর pending নেই।', 'warning');
  if (wd.assignedMod !== AppState.user.uid) return showToast('এটি আপনার assigned নয়।', 'error');

  var now = Date.now();
  var uSnap = await db.ref('users/' + wd.uid).once('value');
  var u = uSnap.val() || {};
  var newBalance = (Number(u.balance) || 0) + (Number(wd.amount) || 0);

  var pcSnap = await db.ref('moderators/' + AppState.user.uid + '/pendingCount').once('value');
  var currentPc = Number(pcSnap.val()) || 0;

  var updates = {};
  updates['withdrawals/' + wdId + '/status'] = 'rejected';
  updates['withdrawals/' + wdId + '/rejectedBy'] = AppState.user.uid;
  updates['withdrawals/' + wdId + '/rejectedAt'] = now;
  updates['withdrawals/' + wdId + '/rejectReason'] = reason || 'কারণ দেওয়া হয়নি';
  updates['users/' + wd.uid + '/balance'] = newBalance;
  updates['moderators/' + AppState.user.uid + '/pendingCount'] = Math.max(0, currentPc - 1);

  await db.ref().update(updates);

  showToast('রিকোয়েস্ট বাতিল হয়েছে, ইউজারকে রিফান্ড করা হয়েছে', 'info');
} catch (err) {
  console.error('[ModReject]', err);
  showToast('বাতিলে সমস্যা', 'error');
             }
}

/* ============================================================
   INJECT GOOGLE BUTTONS
   ============================================================ */
function injectGoogleButtons() {
  var googleSvg = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    '</svg>';

  var loginDivider = document.querySelector('#screen-login .divider');
  if (loginDivider && !document.getElementById('btnGoogleLogin')) {
    var wrap = document.createElement('div');
    wrap.className = 'google-wrap';
    wrap.innerHTML = '<button id="btnGoogleLogin" class="btn-google">' + googleSvg + '<span>গুগল দিয়ে লগইন</span></button>';
    loginDivider.parentNode.insertBefore(wrap, loginDivider.nextSibling);
  }

  var regDivider = document.querySelector('#screen-register .divider');
  if (regDivider && !document.getElementById('btnGoogleRegister')) {
    var wrap2 = document.createElement('div');
    wrap2.className = 'google-wrap';
    wrap2.innerHTML = '<button id="btnGoogleRegister" class="btn-google">' + googleSvg + '<span>গুগল দিয়ে রেজিস্টার</span></button>';
    regDivider.parentNode.insertBefore(wrap2, regDivider.nextSibling);
  }
}

/* ============================================================
   BIND EVENTS
   ============================================================ */
function bindEvents() {
  // URL থেকে referral code নেওয়া
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var refFromUrl = urlParams.get('ref');
    if (refFromUrl) {
      var refInput = $('regReferralCode');
      if (refInput) refInput.value = refFromUrl;
      setTimeout(function () {
        if (!AppState.user) showScreen('screen-register');
      }, APP_CONST.splash + 500);
    }
  } catch (e) { console.warn('URL ref parse failed:', e); }

  $('btnLogin').addEventListener('click', handleLogin);
  $('btnRegister').addEventListener('click', handleRegister);
  $('btnLogout').addEventListener('click', handleLogout);

  setTimeout(function () {
    var gl = $('btnGoogleLogin');
    var gr = $('btnGoogleRegister');
    if (gl) gl.addEventListener('click', handleGoogleAuth);
    if (gr) gr.addEventListener('click', handleGoogleAuth);
  }, 50);

  $('linkToRegister').addEventListener('click', function (e) { e.preventDefault(); clearError('regError'); showScreen('screen-register'); });
  $('linkToLogin').addEventListener('click', function (e) { e.preventDefault(); clearError('loginError'); showScreen('screen-login'); });

  $('loginPassword').addEventListener('keydown', function (e) { if (e.key === 'Enter') handleLogin(); });
  $('regPassword').addEventListener('keydown', function (e) { if (e.key === 'Enter') handleRegister(); });

  $all('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var page = item.dataset.nav;
      if (page) navigateTo(page);
    });
  });

  $all('.quick-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nav = btn.dataset.nav;
      if (nav) navigateTo(nav);
    });
  });

  $('btnBackFromTask').addEventListener('click', function () {
    if (AppState.timerInterval) { clearInterval(AppState.timerInterval); AppState.timerInterval = null; }
    navigateTo('tasks');
  });

  $('btnOpenLink').addEventListener('click', function () {
    if (!AppState.currentTask || !AppState.currentTask.link) return showToast('লিংক পাওয়া যায়নি', 'error');
    AppState.linkOpened = true;
    window.open(AppState.currentTask.link, '_blank', 'noopener,noreferrer');
  });

  $('btnClaim').addEventListener('click', handleClaimReward);

  $all('.method-btn').forEach(function (mb) {
    mb.addEventListener('click', function () {
      $all('.method-btn').forEach(function (x) { x.classList.remove('active'); });
      mb.classList.add('active');
    });
  });

  $('btnWithdraw').addEventListener('click', handleWithdraw);

  $all('.history-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $all('.history-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      AppState.historyTab = tab.dataset.tab;
      renderHistory();
    });
  });

  // Referral Copy বাটন
  var btnCopy = $('btnCopyRef');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      if (!AppState.profile || !AppState.profile.referralCode) return;
      var code = AppState.profile.referralCode;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          showToast('কোড কপি হয়েছে: ' + code, 'success');
        }).catch(function () {
          alert('আপনার কোড: ' + code);
        });
      } else {
        alert('আপনার কোড: ' + code);
      }
    });
  }

  // Referral Share বাটন
  var btnShare = $('btnShareRef');
  if (btnShare) {
    btnShare.addEventListener('click', function () {
      if (!AppState.profile || !AppState.profile.referralCode) return;
      var code = AppState.profile.referralCode;
      var link = window.location.origin + window.location.pathname + '?ref=' + code;
      var text = 'Roile Earn9 এ যোগ দিন! টাস্ক করে আয় করুন।\n\nআমার রেফারেল লিংক: ' + link;
      if (navigator.share) {
        navigator.share({ title: 'Roile Earn9', text: text }).catch(function () {});
      } else {
        alert(text);
      }
    });
  }
}

/* ============================================================
   GLOBAL ERROR HANDLERS
   ============================================================ */
window.addEventListener('error', function (e) {
  console.error('[GlobalError]', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', function (e) {
  console.error('[UnhandledPromise]', e.reason);
});

/* ============================================================
   BOOTSTRAP
   ============================================================ */
(function bootstrap() {
  getOrCreateDeviceId();
  captureRefFromURL();

  document.addEventListener('DOMContentLoaded', function () {
    try {
      injectGoogleButtons();
      bindEvents();
    } catch (e) {
      console.error('[Bootstrap bindEvents]', e);
    }
  });

  setTimeout(function () {
    showScreen('screen-login');

    if (!auth || !db) {
      console.error('[Bootstrap] Firebase not ready');
      showError('loginError', 'Firebase লোড হয়নি। ইন্টারনেট চেক করে রিফ্রেশ দিন।');
      return;
    }

    try {
      handleRedirectResult();
      initAuthListener();
    } catch (e) {
      console.error('[Bootstrap] auth error:', e);
      showError('loginError', 'লগইন সিস্টেমে সমস্যা: ' + e.message);
    }

    setInterval(function () {
      if (AppState.user) checkModeratorStatus();
    }, 20000);
  }, APP_CONST.splash);
})();
