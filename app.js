/* ============================================================
   Rx Earn9 — Galaxy Edition (app.js)
   Full-Stack Implementation with i18n, Dynamic Templates & Fixes
   ============================================================ */
'use strict';

/* Firebase Configuration */
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
  console.log('[Rx Earn9] Firebase initialized ✔');
} catch (e) {
  console.error('[Rx Earn9] Firebase init failed:', e);
  alert('Firebase লোড করতে সমস্যা হয়েছে। ইন্টারনেট চেক করে রিফ্রেশ দিন।');
}

/* Constants */
const APP_CONST = {
  taskDuration: 30,
  cooldown: 60,
  minWithdraw: 50,
  splash: 1800,
  cooldownKey: 'roile_cooldown_until',
  deviceKey: 'roile_device_id',
  langKey: 'roile_language'
};

/* State */
const AppState = {
  user: null,
  profile: null,
  lang: 'bn',
  tasks: {},
  settings: { notice: '', minWithdraw: 50, taskDuration: 30, cooldownDuration: 60, requiredReferrals: 0 },
  isModerator: false,
  currentTask: null,
  timerInterval: null,
  currentTimerValue: 0,
  taskStartTime: null,
  serverTimeOffset: 0,
  cdInterval: null,
  listeners: { profile: null, notice: null, tasks: null, history: null, modPanel: null, referral: null },
  historyTab: 'earnings',
  _withdrawals: {},
  linkOpened: false,
  // Double-click action guards
  _isClaiming: false,
  _isWithdrawing: false,
  _isLoggingIn: false,
  _isRegistering: false,
  _isModAction: false
};

/* ============================================================
   BILINGUAL (EN/BN) TRANSLATIONS
   ============================================================ */
const translations = {
  en: {
    app_title: "Rx Earn9 - Galaxy Edition",
    splash_tagline: "Complete tasks, start earning",
    login_title: "Log In",
    login_subtitle: "Access your account",
    label_email: "Email",
    label_password: "Password",
    placeholder_email: "example@gmail.com",
    placeholder_password: "Your password",
    placeholder_password_min: "At least 6 characters",
    placeholder_name: "Your full name",
    placeholder_phone: "01XXXXXXXXX",
    placeholder_ref_input: "Enter referral code (if any)",
    placeholder_amount: "50",
    placeholder_prompt_ref: "e.g. RITA96-A7B",
    btn_login: "Log In",
    btn_register: "Register",
    no_account: "Don't have an account?",
    already_account: "Already have an account?",
    link_register: "Register here",
    link_login: "Log In here",
    register_title: "Register",
    register_subtitle: "Create a new account",
    label_fullname: "Full Name",
    label_phone: "Mobile Number",
    label_ref_code_optional: "Referral Code (Optional)",
    default_username: "User",
    status_active: "Active",
    status_admin: "Admin",
    status_moderator: "Moderator",
    role_user: "User",
    label_balance: "Current Balance",
    badge_live: "LIVE",
    label_total_earned: "Total Earned",
    label_total_withdrawn: "Total Withdrawn",
    label_role: "Role",
    title_notice: "Notice Board",
    notice_loading: "Loading notice...",
    title_referral: "Referral Program",
    subtitle_referral: "Invite your friends",
    label_referred: "Referred",
    label_ref_status: "Status",
    status_locked: "🔒 Locked",
    status_unlocked: "✅ Unlocked",
    unit_people: "people",
    btn_copy: "Copy",
    btn_share: "Share",
    nav_home: "Home",
    nav_tasks: "Tasks",
    nav_withdraw: "Withdraw",
    nav_history: "History",
    nav_mod: "Mod Panel",
    tasks_page_title: "Available Tasks",
    tasks_page_subtitle: "Complete tasks to earn rewards",
    tasks_loading: "Loading tasks...",
    btn_back: "Back",
    viewer_title: "Task",
    viewer_desc: "Description",
    timer_seconds: "seconds",
    btn_open_task: "Open Task",
    btn_install_app: "Install App / Game",
    btn_claim_reward: "Claim Reward",
    withdraw_title: "Withdraw Request",
    withdraw_subtitle: "Minimum ৳50 can be withdrawn",
    label_avail_balance: "Available Balance",
    label_payment_method: "Payment Method",
    method_bkash: "bKash",
    method_nagad: "Nagad",
    label_account_number: "Mobile Number",
    label_withdraw_amount: "Amount (৳)",
    btn_submit_withdraw: "Submit Request",
    history_title: "Transaction History",
    history_subtitle: "All your earnings & withdrawals",
    tab_earnings: "Earnings",
    tab_withdrawals: "Withdrawals",
    empty_history: "No transactions found",
    empty_tasks: "No tasks available at the moment. Check back soon.",
    empty_mod_requests: "No pending requests assigned to you.",
    mod_title: "Moderator Panel",
    mod_subtitle: "Withdraw requests assigned to you",
    prompt_ref_title: "🎁 Have a Referral Code?",
    prompt_ref_desc: "Invited by a friend? Enter their code or skip.",
    btn_skip: "Skip",
    btn_apply: "Apply",
    cooldown_title: "Please Wait",
    cooldown_desc: "Please wait before opening the next task",
    status_approved: "Approved",
    status_rejected: "Rejected",
    status_pending: "Pending",
    status_completed: "Completed",
    btn_approve: "Approve",
    btn_reject: "Reject",
    mod_col_method: "Method",
    mod_col_number: "Number",
    mod_col_time: "Time",
    err_name: "Please enter a valid name (at least 2 characters).",
    err_email: "Please enter a valid email address.",
    err_phone: "Please enter a valid BD phone number (01XXXXXXXXX).",
    err_pass: "Password must be at least 6 characters.",
    err_pass_required: "Please enter your password.",
    err_device_locked: "This device already has an account registered.",
    err_self_referral: "❌ You cannot use your own referral code.",
    err_invalid_ref: "❌ Invalid referral code.",
    err_enter_ref_or_skip: "Enter a code or press Skip.",
    err_banned: "Your account has been banned.",
    err_vpn: "🚫 VPN / Proxy detected! Please disconnect.",
    err_task_not_found: "Task not found.",
    err_task_time_not_completed: "Task time is not finished yet! Please wait.",
    err_claim_failed: "Failed to claim reward. Please try again.",
    err_daily_cap: "You have reached the daily limit for this task today!",
    err_no_login: "You are not logged in.",
    err_amount_min: "Minimum withdrawal amount is ৳",
    err_insufficient_bal: "Insufficient balance.",
    err_ref_required_wd: "You need {need} referrals to withdraw. You have: {have}/{need}",
    err_pending_wd_exists: "You already have a pending withdrawal request. Please wait until it completes.",
    err_no_moderator: "No moderators available right now. Please try again later.",
    err_wd_failed: "Failed to submit withdrawal request. Please try again.",
    msg_reg_success: "Registration successful! Welcome.",
    msg_logout_success: "Logged out successfully.",
    msg_ref_applied: "🎉 Referral applied successfully!",
    msg_timer_finished: "Timer finished! Claim your reward now.",
    msg_earned: "earned!",
    msg_wd_success: "Withdrawal request submitted successfully!",
    msg_wd_approved: "Withdrawal request approved.",
    msg_wd_rejected: "Withdrawal rejected & balance refunded to user.",
    msg_copied: "Code copied: ",
    prompt_reject_reason: "Enter rejection reason (optional):",
    confirm_approve: "Approve this withdrawal request?",
    confirm_logout: "Are you sure you want to log out?",
    btn_processing: "Processing...",
    btn_waiting: "Please wait...",
    ref_unlocked_msg: "✅ You can make withdrawal requests",
    ref_locked_msg: "Refer {req} friends to unlock withdrawals",
    ref_disabled_msg: "Referral requirement not active"
  },
  bn: {
    app_title: "Rx Earn9 - Galaxy Edition",
    splash_tagline: "টাস্ক সম্পন্ন করুন, আয় শুরু করুন",
    login_title: "লগইন করুন",
    login_subtitle: "আপনার অ্যাকাউন্টে প্রবেশ করুন",
    label_email: "ইমেইল",
    label_password: "পাসওয়ার্ড",
    placeholder_email: "example@gmail.com",
    placeholder_password: "আপনার পাসওয়ার্ড",
    placeholder_password_min: "কমপক্ষে ৬ অক্ষর",
    placeholder_name: "আপনার নাম",
    placeholder_phone: "01XXXXXXXXX",
    placeholder_ref_input: "কারো কোড থাকলে দিন",
    placeholder_amount: "50",
    placeholder_prompt_ref: "যেমন: RITA96-A7B",
    btn_login: "লগইন",
    btn_register: "রেজিস্টার",
    no_account: "অ্যাকাউন্ট নেই?",
    already_account: "অ্যাকাউন্ট আছে?",
    link_register: "রেজিস্টার করুন",
    link_login: "লগইন করুন",
    register_title: "রেজিস্টার করুন",
    register_subtitle: "নতুন অ্যাকাউন্ট তৈরি করুন",
    label_fullname: "পূর্ণ নাম",
    label_phone: "মোবাইল নম্বর",
    label_ref_code_optional: "রেফারেল কোড (ঐচ্ছিক)",
    default_username: "ব্যবহারকারী",
    status_active: "সক্রিয়",
    status_admin: "অ্যাডমিন",
    status_moderator: "মডারেটর",
    role_user: "ব্যবহারকারী",
    label_balance: "বর্তমান ব্যালেন্স",
    badge_live: "লাইভ",
    label_total_earned: "মোট আয়",
    label_total_withdrawn: "মোট উইথড্র",
    label_role: "ভূমিকা",
    title_notice: "নোটিশ বোর্ড",
    notice_loading: "লোড হচ্ছে...",
    title_referral: "Referral Program",
    subtitle_referral: "বন্ধুদের আমন্ত্রণ জানান",
    label_referred: "রেফার হয়েছে",
    label_ref_status: "স্ট্যাটাস",
    status_locked: "🔒 Locked",
    status_unlocked: "✅ Unlocked",
    unit_people: "জন",
    btn_copy: "কপি",
    btn_share: "শেয়ার",
    nav_home: "হোম",
    nav_tasks: "টাস্ক",
    nav_withdraw: "উইথড্র",
    nav_history: "হিস্ট্রি",
    nav_mod: "মড প্যানেল",
    tasks_page_title: "উপলব্ধ টাস্ক",
    tasks_page_subtitle: "টাস্ক সম্পন্ন করে রিওয়ার্ড পান",
    tasks_loading: "টাস্ক লোড হচ্ছে...",
    btn_back: "ফিরে যান",
    viewer_title: "টাস্ক",
    viewer_desc: "বিবরণ",
    timer_seconds: "সেকেন্ড",
    btn_open_task: "টাস্ক ওপেন করুন",
    btn_install_app: "গেম/অ্যাপ ইনস্টল করুন",
    btn_claim_reward: "রিওয়ার্ড ক্লেইম করুন",
    withdraw_title: "উইথড্র রিকোয়েস্ট",
    withdraw_subtitle: "নূন্যতম ৳50 উত্তোলন করা যাবে",
    label_avail_balance: "উপলব্ধ ব্যালেন্স",
    label_payment_method: "পেমেন্ট মেথড",
    method_bkash: "বিকাশ",
    method_nagad: "নগদ",
    label_account_number: "মোবাইল নম্বর",
    label_withdraw_amount: "পরিমাণ (৳)",
    btn_submit_withdraw: "রিকোয়েস্ট পাঠান",
    history_title: "লেনদেনের ইতিহাস",
    history_subtitle: "আপনার সব আয় ও উইথড্র",
    tab_earnings: "আয়",
    tab_withdrawals: "উইথড্র",
    empty_history: "কোনো তথ্য নেই",
    empty_tasks: "এই মুহূর্তে কোনো টাস্ক নেই। পরে আবার চেক করুন।",
    empty_mod_requests: "আপনার কাছে কোনো pending রিকোয়েস্ট নেই।",
    mod_title: "মডারেটর প্যানেল",
    mod_subtitle: "আপনার কাছে assigned উইথড্র রিকোয়েস্ট",
    prompt_ref_title: "🎁 Referral Code আছে?",
    prompt_ref_desc: "কারো আমন্ত্রণে এসেছেন? কোড দিন — অথবা Skip করুন।",
    btn_skip: "Skip",
    btn_apply: "Apply",
    cooldown_title: "একটু অপেক্ষা করুন",
    cooldown_desc: "পরবর্তী টাস্কের জন্য অপেক্ষা করুন",
    status_approved: "অনুমোদিত",
    status_rejected: "বাতিল",
    status_pending: "অপেক্ষমাণ",
    status_completed: "সম্পন্ন",
    btn_approve: "অনুমোদন",
    btn_reject: "বাতিল",
    mod_col_method: "মেথড",
    mod_col_number: "নম্বর",
    mod_col_time: "সময়",
    err_name: "সঠিক নাম দিন (কমপক্ষে ২ অক্ষর)।",
    err_email: "সঠিক ইমেইল দিন।",
    err_phone: "সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)।",
    err_pass: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।",
    err_pass_required: "পাসওয়ার্ড দিন।",
    err_device_locked: "এই ডিভাইসে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।",
    err_self_referral: "❌ নিজের কোড ব্যবহার করা যাবে না।",
    err_invalid_ref: "❌ কোডটি সঠিক নয়।",
    err_enter_ref_or_skip: "কোড দিন অথবা Skip চাপুন।",
    err_banned: "আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে।",
    err_vpn: "🚫 VPN / Proxy শনাক্ত হয়েছে! বন্ধ করুন।",
    err_task_not_found: "টাস্ক খুঁজে পাওয়া যায়নি।",
    err_task_time_not_completed: "টাস্কের সম্পূর্ণ সময় পার হয়নি! অপেক্ষা করুন।",
    err_claim_failed: "ক্লেইম করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    err_daily_cap: "আজকে এই টাস্কটির দৈনিক লিমিট শেষ হয়ে গেছে!",
    err_no_login: "লগইন নেই।",
    err_amount_min: "নূন্যতম ৳",
    err_insufficient_bal: "পর্যাপ্ত ব্যালেন্স নেই।",
    err_ref_required_wd: "Withdraw এর জন্য {need} জনকে রেফার করতে হবে। আপনি করেছেন: {have}/{need}",
    err_pending_wd_exists: "আপনার একটি pending রিকোয়েস্ট আছে। আগে সেটি সম্পন্ন হোক।",
    err_no_moderator: "এই মুহূর্তে কোনো মডারেটর নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    err_wd_failed: "রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    msg_reg_success: "রেজিস্ট্রেশন সফল! স্বাগতম।",
    msg_logout_success: "লগআউট হয়েছে",
    msg_ref_applied: "🎉 Referral সফলভাবে যোগ হয়েছে!",
    msg_timer_finished: "টাইমার শেষ! এখন রিওয়ার্ড ক্লেইম করুন।",
    msg_earned: "আয় হয়েছে!",
    msg_wd_success: "উইথড্র রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!",
    msg_wd_approved: "রিকোয়েস্ট অনুমোদিত হয়েছে",
    msg_wd_rejected: "রিকোয়েস্ট বাতিল হয়েছে, ইউজারকে রিফান্ড করা হয়েছে",
    msg_copied: "কোড কপি হয়েছে: ",
    prompt_reject_reason: "বাতিলের কারণ লিখুন (ঐচ্ছিক):",
    confirm_approve: "এই রিকোয়েস্ট অনুমোদন করবেন?",
    confirm_logout: "আপনি কি লগআউট করতে চান?",
    btn_processing: "প্রসেস হচ্ছে...",
    btn_waiting: "অপেক্ষা করুন...",
    ref_unlocked_msg: "✅ আপনি withdraw করতে পারবেন",
    ref_locked_msg: "{req} জন রেফার করলে আনলক হবে",
    ref_disabled_msg: "রেফারেল সিস্টেম চালু নেই"
  }
};

function t(key, params) {
  var lang = AppState.lang || 'bn';
  var str = (translations[lang] && translations[lang][key]) || (translations.en && translations.en[key]) || key;
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(function (k) {
      str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    });
  }
  return str;
}

/* ============================================================
   FIX 1: PREVENT LANGUAGE TOGGLE FROM OVERWRITING DYNAMIC DATA
   ============================================================ */
function setLanguage(lang) {
  if (!translations[lang]) lang = 'bn';
  AppState.lang = lang;
  try { localStorage.setItem(APP_CONST.langKey, lang); } catch (e) {}
  document.documentElement.lang = lang;

  // Sync button toggles
  $all('.lang-btn').forEach(function (btn) {
    if (btn.dataset.lang === lang) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  // Dynamic IDs that must NEVER be overwritten with static i18n text
  var dynamicElementIds = [
    'dashNotice', 'refCode', 'refCount', 'dashBalance',
    'dashTotalEarned', 'dashTotalWithdrawn', 'wdBalance',
    'headerName', 'headerStatus', 'dashRole', 'dashEmail',
    'dashPhone', 'refStatus', 'refSubtitle', 'timerNumber', 'cdNumber'
  ];

  // Static i18n replacements (skipping dynamic elements)
  $all('[data-i18n]').forEach(function (el) {
    if (el.id && dynamicElementIds.indexOf(el.id) !== -1) return;
    if (el.dataset.dynamic === 'true') return;
    var key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // Placeholder replacements
  $all('[data-i18n-placeholder]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });

  // Re-apply live dynamic data safely
  if (AppState.settings && AppState.settings.notice) {
    var nEl = $('dashNotice');
    if (nEl) nEl.textContent = AppState.settings.notice;
  }

  if (AppState.profile) {
    updateReferralUI(AppState.profile);
    var hName = $('headerName');
    if (hName) hName.textContent = AppState.profile.name || t('default_username');
    var hStat = $('headerStatus');
    if (hStat) {
      hStat.textContent = AppState.profile.role === 'admin' ? t('status_admin') : (AppState.profile.role === 'moderator' ? t('status_moderator') : t('status_active'));
    }
    var dRole = $('dashRole');
    if (dRole) {
      dRole.textContent = AppState.profile.role === 'admin' ? t('status_admin') : (AppState.profile.role === 'moderator' ? t('status_moderator') : t('role_user'));
    }
    var dBal = $('dashBalance');
    if (dBal) dBal.textContent = formatMoney(AppState.profile.balance);
    var dEarn = $('dashTotalEarned');
    if (dEarn) dEarn.textContent = '৳' + formatMoney(AppState.profile.totalEarned);
    var dWd = $('dashTotalWithdrawn');
    if (dWd) dWd.textContent = '৳' + formatMoney(AppState.profile.totalWithdrawn);
    var wBal = $('wdBalance');
    if (wBal) wBal.textContent = formatMoney(AppState.profile.balance);
  }

  renderTasks();
  if (AppState.user) renderHistory();
}

/* ============================================================
   HELPERS & DOM UTILS
   ============================================================ */
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

  // Fix 4: If navigating away from task viewer, stop timer lag
  if (pageName !== 'task-viewer' && AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }

  if (pageName === 'history') attachHistoryListeners();
  if (pageName === 'mod-panel' && AppState.isModerator) attachModPanelListener();
}

function setButtonText(btn, text) {
  if (!btn) return;
  var span = btn.querySelector('span');
  if (span) {
    span.textContent = text;
  } else {
    var svg = btn.querySelector('svg');
    if (svg) {
      var child = btn.lastChild;
      if (child && child.nodeType === Node.TEXT_NODE) {
        child.nodeValue = ' ' + text;
      } else {
        var s = document.createElement('span');
        s.textContent = text;
        btn.appendChild(s);
      }
    } else {
      btn.textContent = text;
    }
  }
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

function formatMoney(num) {
  var n = Number(num) || 0;
  return n.toFixed(2);
}

function formatDate(ts) {
  if (!ts) return '-';
  var d = new Date(ts);
  var lang = AppState.lang || 'bn';
  var monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var monthsBn = ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];
  var months = lang === 'en' ? monthsEn : monthsBn;

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
  var lang = AppState.lang || 'bn';
  var mapEn = {
    'auth/email-already-in-use': 'An account already exists with this email.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account exists with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-login-credentials': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many failed attempts. Please wait a moment.',
    'auth/network-request-failed': 'No internet connection. Please check your network.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/missing-password': 'Password is required.'
  };
  var mapBn = {
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
  var map = lang === 'en' ? mapEn : mapBn;
  return map[code] || (lang === 'en' ? 'An error occurred, please try again.' : 'সমস্যা হয়েছে, আবার চেষ্টা করুন।');
}

/* ============================================================
   FIX 3: PERFORMANCE & SINGLE-LISTENER MANAGEMENT
   ============================================================ */
function detachListener(key) {
  var l = AppState.listeners[key];
  if (l && l.ref && typeof l.ref.off === 'function') {
    try { l.ref.off(l.event || 'value', l.cb); } catch (e) {}
  }
  AppState.listeners[key] = null;
}

function detachAllListeners() {
  Object.keys(AppState.listeners).forEach(function (k) {
    detachListener(k);
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
   REFERRAL SYSTEM & DEVICE LOCK LOGIC
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

function generateReferralCode(email) {
  var base = (email || 'user').split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (base.length < 3) base = 'USER';
  var rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return base + '-' + rand;
}

/* ============================================================
   FIX 2: IMMEDIATE UI UPDATES FOR REFERRAL DATA
   ============================================================ */
function updateReferralUI(data) {
  if (!data) return;
  var codeEl = $('refCode');
  if (codeEl) codeEl.textContent = data.referralCode || '---';

  var countEl = $('refCount');
  if (countEl) countEl.textContent = data.referralCount || 0;

  var statusEl = $('refStatus');
  var subEl = $('refSubtitle');
  var required = (AppState.settings && AppState.settings.requiredReferrals) || 0;
  var myCount = data.referralCount || 0;
  var unlocked = (required === 0) || (myCount >= required);

  if (statusEl) {
    if (unlocked) {
      statusEl.textContent = t('status_unlocked');
      statusEl.className = 'ref-status unlocked glass-badge';
    } else {
      statusEl.textContent = '🔒 ' + myCount + '/' + required;
      statusEl.className = 'ref-status locked glass-badge';
    }
  }
  if (subEl) {
    if (required === 0) subEl.textContent = t('ref_disabled_msg');
    else if (unlocked) subEl.textContent = t('ref_unlocked_msg');
    else subEl.textContent = t('ref_locked_msg', { req: required });
  }
}

function attachReferralListener() {
  if (!AppState.user) return;
  var myCode = AppState.profile && AppState.profile.referralCode;
  if (!myCode) return;

  // Prevent duplicate listener attachments to the same node
  if (AppState.listeners.referral && AppState.listeners.referral.code === myCode) {
    return;
  }
  detachListener('referral');

  var ref = db.ref('referrals/' + myCode);
  var cb = function (snap) {
    var data = snap.val() || {};
    var count = Object.keys(data).length;
    var required = (AppState.settings && AppState.settings.requiredReferrals) || 0;
    var isUnlocked = (required === 0) || (count >= required);
    var needUnlock = isUnlocked && !(AppState.profile && AppState.profile.referralUnlocked);

    // Immediately update UI
    updateReferralUI({
      referralCode: myCode,
      referralCount: count,
      referralUnlocked: isUnlocked
    });

    if (AppState.profile && ((AppState.profile.referralCount || 0) !== count || needUnlock)) {
      AppState.profile.referralCount = count;
      if (needUnlock) AppState.profile.referralUnlocked = true;

      var updates = { referralCount: count };
      if (needUnlock) updates.referralUnlocked = true;
      db.ref('users/' + AppState.user.uid).update(updates).catch(function () {});
    }
  };

  ref.on('value', cb);
  AppState.listeners.referral = { ref: ref, event: 'value', cb: cb, code: myCode };
}

/* ============================================================
   AUTH: REGISTER & LOGIN (EMAIL / PASSWORD ONLY)
   ============================================================ */
async function handleRegister() {
  if (AppState._isRegistering) return;
  clearError('regError');

  var name = ($('regName').value || '').trim();
  var email = ($('regEmail').value || '').trim().toLowerCase();
  var phone = ($('regPhone').value || '').trim();
  var password = $('regPassword').value || '';

  if (name.length < 2) return showError('regError', t('err_name'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('regError', t('err_email'));
  if (!/^01[3-9]\d{8}$/.test(phone)) return showError('regError', t('err_phone'));
  if (password.length < 6) return showError('regError', t('err_pass'));

  var btn = $('btnRegister');
  AppState._isRegistering = true;
  btn.disabled = true;
  setButtonText(btn, t('btn_waiting'));

  var createdUser = null;
  try {
    var cred = await auth.createUserWithEmailAndPassword(email, password);
    createdUser = cred.user;

    var deviceId = getOrCreateDeviceId();
    var lockInfo = await isDeviceLocked(deviceId, createdUser.uid);
    if (lockInfo.locked) {
      try { await createdUser.delete(); } catch (e) { console.warn(e); }
      await auth.signOut().catch(function () {});
      return showError('regError', t('err_device_locked'));
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
      clearPendingRef();
    }

    try { await createdUser.updateProfile({ displayName: name }); } catch (e) {}
    showToast(t('msg_reg_success'), 'success');
  } catch (err) {
    console.error('[Register]', err);
    showError('regError', translateAuthError(err.code));
    if (createdUser && auth.currentUser && auth.currentUser.uid === createdUser.uid) {
      try {
        var snap = await db.ref('users/' + createdUser.uid).once('value');
        if (!snap.exists()) await createdUser.delete();
      } catch (e) {}
    }
  } finally {
    AppState._isRegistering = false;
    btn.disabled = false;
    setButtonText(btn, t('btn_register'));
  }
}

async function handleLogin() {
  if (AppState._isLoggingIn) return;
  clearError('loginError');

  var email = ($('loginEmail').value || '').trim().toLowerCase();
  var password = $('loginPassword').value || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('loginError', t('err_email'));
  if (!password) return showError('loginError', t('err_pass_required'));

  var btn = $('btnLogin');
  AppState._isLoggingIn = true;
  btn.disabled = true;
  setButtonText(btn, t('btn_waiting'));

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    console.error('[Login]', err);
    showError('loginError', translateAuthError(err.code));
  } finally {
    AppState._isLoggingIn = false;
    btn.disabled = false;
    setButtonText(btn, t('btn_login'));
  }
}

async function handleLogout() {
  if (!confirm(t('confirm_logout'))) return;
  try {
    detachAllListeners();
    localStorage.removeItem(APP_CONST.cooldownKey);
    await auth.signOut();
    showToast(t('msg_logout_success'), 'info');
  } catch (err) {
    console.error('[Logout]', err);
    showToast('Logout error', 'error');
  }
}

/* ============================================================
   REFERRAL PROMPT MODAL
   ============================================================ */
function showReferralPrompt() {
  var modal = $('referralPromptModal');
  if (modal) modal.classList.remove('hidden');
}

function hideReferralPrompt() {
  var modal = $('referralPromptModal');
  if (modal) modal.classList.add('hidden');
  if (AppState.user) {
    db.ref('users/' + AppState.user.uid + '/referralAsked').set(true).catch(function () {});
  }
}

async function applyReferralFromPrompt() {
  var code = ($('promptRefCode').value || '').trim().toUpperCase();
  var msg = $('promptRefMsg');
  if (!code) {
    msg.className = 'error-box error';
    msg.textContent = t('err_enter_ref_or_skip');
    msg.classList.remove('hidden');
    return;
  }
  if (!AppState.user) return;

  var btn = $('btnApplyRef');
  btn.disabled = true;
  setButtonText(btn, t('btn_waiting'));

  try {
    var refSnap = await db.ref('users').orderByChild('referralCode').equalTo(code).once('value');
    var refData = refSnap.val();
    if (!refData) {
      msg.className = 'error-box error';
      msg.textContent = t('err_invalid_ref');
      msg.classList.remove('hidden');
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
      msg.textContent = t('err_self_referral');
      msg.classList.remove('hidden');
      return;
    }

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

    showToast(t('msg_ref_applied'), 'success');
    hideReferralPrompt();
  } catch (e) {
    console.error('[ReferralPrompt]', e);
    msg.className = 'error-box error';
    msg.textContent = t('err_wd_failed');
    msg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    setButtonText(btn, t('btn_apply'));
  }
}

async function skipReferralPrompt() {
  if (AppState.user) {
    try {
      await db.ref('users/' + AppState.user.uid + '/referralAsked').set(true);
    } catch (e) { console.warn(e); }
  }
  hideReferralPrompt();
}

/* ============================================================
   PROFILE INITIALIZATION & VPN DETECTION
   ============================================================ */
async function ensureProfile(user) {
  var ref = db.ref('users/' + user.uid);
  var snap = null;

  try {
    snap = await ref.once('value');
  } catch (e) {
    console.error('[ensureProfile] read failed:', e);
    return null;
  }

  if (snap && snap.exists()) {
    var existingData = snap.val() || {};
    if (!existingData.referralCode) {
      var newCode = generateReferralCode(existingData.email || user.email || '');
      try {
        await db.ref('users/' + user.uid).update({
          referralCode: newCode,
          referralCount: existingData.referralCount || 0,
          referralUnlocked: existingData.referralUnlocked || false,
          referredBy: existingData.referredBy || ''
        });
        existingData.referralCode = newCode;
      } catch (e) {
        console.warn('[ensureProfile] code update failed:', e);
      }
    }
    return existingData;
  }

  var deviceId = getOrCreateDeviceId();
  var lockInfo = await isDeviceLocked(deviceId, user.uid);
  if (lockInfo.locked) {
    alert(t('err_device_locked'));
    await auth.signOut();
    return null;
  }

  var now = Date.now();
  var myRefCode = generateReferralCode(user.email || '');
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
    } catch (e) { console.warn('[Referral] lookup error:', e); }
  }

  var profile = {
    name: user.displayName || (user.email ? user.email.split('@')[0] : t('default_username')),
    email: user.email || '',
    phone: '',
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
    referralAsked: !!referrerUid,
    createdAt: now,
    lastLogin: now
  };

  try {
    await ref.set(profile);
    await db.ref('devices/' + deviceId).set({ uid: user.uid, createdAt: now });

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
      showToast(t('msg_ref_applied'), 'success');
    }
    return profile;
  } catch (e) {
    console.error('[ensureProfile]', e);
    return profile;
  }
}

async function checkVPN() {
  var result = { vpn: false, layer: null, ip: null, country: null };
  var ipData1 = null;

  try {
    ipData1 = await fetch('https://ipwho.is/').then(function (r) { return r.json(); });
    result.ip = ipData1.ip;
    result.country = ipData1.country;

    if (ipData1.security) {
      if (ipData1.security.vpn === true || ipData1.security.proxy === true || ipData1.security.tor === true) {
        return { vpn: true, layer: 'ipwho', ip: ipData1.ip, country: ipData1.country };
      }
    }
  } catch (e) { console.warn('[VPN L1]', e); }

  if (!result.ip) return result;

  try {
    var r2 = await fetch('https://proxycheck.io/v2/' + result.ip + '?vpn=1&asn=1&risk=1').then(function (r) { return r.json(); });
    if (r2 && r2[result.ip]) {
      var d = r2[result.ip];
      if (d.type === 'VPN' || d.type === 'TOR' || (d.proxy === 'yes' && d.risk && Number(d.risk) >= 85)) {
        return { vpn: true, layer: 'proxycheck', ip: result.ip, country: result.country };
      }
    }
  } catch (e) { console.warn('[VPN L2]', e); }

  return result;
}

/* ============================================================
   AUTH LISTENER & FAST INITIALIZATION
   ============================================================ */
function initAuthListener() {
  auth.onAuthStateChanged(async function (user) {
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

    // Connect notice immediately to prevent notice waiting
    attachNoticeListener();

    var prof = await ensureProfile(user);

    if (prof && prof.banned === true) {
      alert(t('err_banned'));
      detachAllListeners();
      await auth.signOut();
      return;
    }

    // Immediately render UI from fetched profile to eliminate "loading" delay
    if (prof) {
      AppState.profile = prof;
      $('headerName').textContent = prof.name || t('default_username');
      $('headerStatus').textContent = prof.role === 'admin' ? t('status_admin') : (prof.role === 'moderator' ? t('status_moderator') : t('status_active'));
      $('dashBalance').textContent = formatMoney(prof.balance);
      $('dashTotalEarned').textContent = '৳' + formatMoney(prof.totalEarned);
      $('dashTotalWithdrawn').textContent = '৳' + formatMoney(prof.totalWithdrawn);
      $('dashEmail').textContent = prof.email || '-';
      $('dashPhone').textContent = prof.phone || '-';
      $('dashRole').textContent = prof.role === 'admin' ? t('status_admin') : (prof.role === 'moderator' ? t('status_moderator') : t('role_user'));
      $('wdBalance').textContent = formatMoney(prof.balance);
      updateReferralUI(prof);
    }

    var deviceId = prof && prof.deviceId ? prof.deviceId : getOrCreateDeviceId();
    db.ref('devices/' + deviceId).once('value').then(function (s) {
      var cur = s.val();
      if (!cur || !cur.uid) {
        db.ref('devices/' + deviceId).set({ uid: user.uid, createdAt: Date.now() }).catch(function () {});
      }
    }).catch(function () {});

    db.ref('users/' + user.uid + '/lastLogin').set(Date.now()).catch(function () {});

    // Attach active real-time listeners cleanly
    attachProfileListener();
    attachTasksListener();
    checkModeratorStatus();

    showScreen('screen-app');
    navigateTo('dashboard');

    // Restore unfinished task from storage if any
    var savedTask = localStorage.getItem('activeTask');
    var savedStartTime = localStorage.getItem('activeTaskStartTime');

    if (savedTask && savedStartTime) {
      try {
        AppState.currentTask = JSON.parse(savedTask);
        AppState.taskStartTime = Number(savedStartTime);
        AppState.linkOpened = true;

        var offset = 0;
        try {
          var snap = await db.ref('.info/serverTimeOffset').once('value');
          offset = snap.val() || 0;
        } catch (e) {}
        AppState.serverTimeOffset = offset;

        var duration = AppState.settings.taskDuration || APP_CONST.taskDuration;
        var currentServerTime = Date.now() + offset;
        var elapsedSec = (currentServerTime - AppState.taskStartTime) / 1000;
        var remaining = duration - Math.floor(elapsedSec);

        $('viewerTitle').textContent = AppState.currentTask.title || t('viewer_title');
        $('viewerDesc').textContent = AppState.currentTask.desc || '';

        if (remaining > 0) {
          AppState.currentTimerValue = remaining;
          $('btnClaim').disabled = true;
          navigateTo('task-viewer');
          startTaskTimer();
        } else {
          AppState.currentTimerValue = 0;
          $('btnClaim').disabled = false;
          navigateTo('task-viewer');
          if (window.AndroidApp && typeof window.AndroidApp.showCrossButton === 'function') {
            try { window.AndroidApp.showCrossButton(); } catch (e) {}
          }
        }
      } catch (e) { console.log('Restore task error', e); }
    } else {
      var hasRef = prof && prof.referredBy;
      var asked = prof && prof.referralAsked === true;
      var pendingRef = getPendingRef();
      if (!hasRef && !asked && !pendingRef) {
        setTimeout(function () { showReferralPrompt(); }, 1200);
      }
    }

    checkVPN().then(function (vres) {
      if (vres.vpn) {
        alert(t('err_vpn'));
        detachAllListeners();
        auth.signOut();
      }
    });
  });
}

/* ============================================================
   LISTENERS: PROFILE, NOTICE, TASKS
   ============================================================ */
function attachProfileListener() {
  if (!AppState.user) return;
  detachListener('profile');

  var ref = db.ref('users/' + AppState.user.uid);
  var cb = function (snap) {
    var data = snap.val();
    if (!data) return;
    AppState.profile = data;

    if (data.banned === true) {
      alert(t('err_banned'));
      detachAllListeners();
      auth.signOut();
      return;
    }

    // Immediately reflect to UI
    $('headerName').textContent = data.name || t('default_username');
    $('headerStatus').textContent = data.role === 'admin' ? t('status_admin') : (data.role === 'moderator' ? t('status_moderator') : t('status_active'));
    $('dashBalance').textContent = formatMoney(data.balance);
    $('dashTotalEarned').textContent = '৳' + formatMoney(data.totalEarned);
    $('dashTotalWithdrawn').textContent = '৳' + formatMoney(data.totalWithdrawn);
    $('dashEmail').textContent = data.email || '-';
    $('dashPhone').textContent = data.phone || '-';
    $('dashRole').textContent = data.role === 'admin' ? t('status_admin') : (data.role === 'moderator' ? t('status_moderator') : t('role_user'));
    $('wdBalance').textContent = formatMoney(data.balance);

    updateReferralUI(data);
    attachReferralListener();

    if (AppState.historyTab === 'earnings') renderHistory();
  };

  ref.on('value', cb);
  AppState.listeners.profile = { ref: ref, event: 'value', cb: cb };
}

/* FIX 2: Notice Board Loads Instantly */
function attachNoticeListener() {
  detachListener('notice');

  var ref = db.ref('settings');
  var cb = function (snap) {
    var s = snap.val() || {};
    AppState.settings = {
      notice: s.notice || (AppState.lang === 'bn' ? 'স্বাগতম! টাস্ক সম্পন্ন করে আয় শুরু করুন।' : 'Welcome! Complete tasks to start earning.'),
      minWithdraw: typeof s.minWithdraw === 'number' ? s.minWithdraw : 50,
      taskDuration: typeof s.taskDuration === 'number' ? s.taskDuration : 30,
      cooldownDuration: typeof s.cooldownDuration === 'number' ? s.cooldownDuration : 60,
      requiredReferrals: typeof s.requiredReferrals === 'number' ? s.requiredReferrals : 0
    };

    var nEl = $('dashNotice');
    if (nEl) {
      nEl.textContent = AppState.settings.notice;
    }
    updateReferralUI(AppState.profile || {});
  };

  ref.on('value', cb);
  AppState.listeners.notice = { ref: ref, event: 'value', cb: cb };
}

function attachTasksListener() {
  detachListener('tasks');

  var ref = db.ref('tasks');
  var cb = function (snap) {
    AppState.tasks = snap.val() || {};
    renderTasks();
  };

  ref.on('value', cb);
  AppState.listeners.tasks = { ref: ref, event: 'value', cb: cb };
}

/* ============================================================
   RENDER TASKS
   ============================================================ */
function renderTasks() {
  var list = $('tasksList');
  if (!list) return;
  var tasks = AppState.tasks || {};
  var ids = Object.keys(tasks).filter(function (id) { return tasks[id] && tasks[id].active === true; });

  if (ids.length === 0) {
    list.innerHTML = '<div class="empty-state glass-card neon-border"><p>' + escapeHtml(t('empty_tasks')) + '</p></div>';
    return;
  }

  list.innerHTML = ids.map(function (id) {
    var tsk = tasks[id];
    var isCpa = tsk.type === 'cpa';

    var svgIcon = isCpa
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';

    return '<div class="task-card" data-task-id="' + escapeHtml(id) + '">' +
      '<div class="task-card-left">' +
        '<div class="task-card-icon">' + svgIcon + '</div>' +
        '<div class="task-card-details">' +
          '<div class="task-card-title">' + escapeHtml(tsk.title || t('viewer_title')) + '</div>' +
          '<div class="task-card-meta"><span>' + escapeHtml(tsk.desc || '') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="task-card-reward">৳' + formatMoney(tsk.reward) + '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.task-card').forEach(function (el) {
    el.addEventListener('click', function () { openTaskViewer(el.dataset.taskId); });
  });
}

/* ============================================================
   FIX 4: ACCURATE TASK VIEWER & LAG-FREE TIMER
   ============================================================ */
async function openTaskViewer(taskId) {
  var tsk = AppState.tasks[taskId];
  if (!tsk) return showToast(t('err_task_not_found'), 'error');

  var cdLeft = getCooldownRemaining();
  if (cdLeft > 0) {
    showCooldownOverlay(cdLeft);
    return;
  }

  try {
    var snap = await db.ref('.info/serverTimeOffset').once('value');
    AppState.serverTimeOffset = snap.val() || 0;
  } catch (e) {
    AppState.serverTimeOffset = 0;
  }

  var currentServerTime = Date.now() + (AppState.serverTimeOffset || 0);
  var startOfDay = new Date(currentServerTime);
  startOfDay.setHours(0, 0, 0, 0);
  var startOfDayTs = startOfDay.getTime();

  var cap = Number(tsk.cap);
  if (cap && cap > 0) {
    var earnings = (AppState.profile && AppState.profile.earnings) || {};
    var countToday = 0;
    Object.keys(earnings).forEach(function (k) {
      var earn = earnings[k];
      if (earn && earn.taskId === taskId && (earn.timestamp || 0) >= startOfDayTs) {
        countToday++;
      }
    });
    if (countToday >= cap) {
      showToast(t('err_daily_cap'), 'error');
      return;
    }
  }

  var taskType = tsk.type === 'cpa' ? 'cpa' : 'timer';

  AppState.taskStartTime = currentServerTime;
  AppState.currentTask = {
    id: taskId,
    title: tsk.title,
    desc: tsk.desc,
    link: tsk.link,
    reward: tsk.reward,
    type: taskType
  };
  AppState.linkOpened = false;

  $('viewerTitle').textContent = tsk.title || t('viewer_title');
  $('viewerDesc').textContent = tsk.desc || '';

  var timerWrapper = $('viewerTimerWrapper');
  var btnClaim = $('btnClaim');
  var btnOpen = $('btnOpenLink');

  if (taskType === 'cpa') {
    if (timerWrapper) timerWrapper.style.display = 'none';
    if (btnClaim) btnClaim.style.display = 'none';
    if (btnOpen) setButtonText(btnOpen, t('btn_install_app'));

    localStorage.removeItem('activeTask');
    localStorage.removeItem('activeTaskStartTime');
    if (AppState.timerInterval) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
    }
  } else {
    if (timerWrapper) timerWrapper.style.display = '';
    if (btnClaim) {
      btnClaim.style.display = '';
      btnClaim.disabled = true;
      setButtonText(btnClaim, t('btn_claim_reward'));
    }
    if (btnOpen) setButtonText(btnOpen, t('btn_open_task'));

    localStorage.setItem('activeTask', JSON.stringify(AppState.currentTask));
    localStorage.setItem('activeTaskStartTime', AppState.taskStartTime);

    AppState.currentTimerValue = AppState.settings.taskDuration || APP_CONST.taskDuration;
    startTaskTimer();
  }

  navigateTo('task-viewer');
}

function startTaskTimer() {
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }

  var duration = AppState.settings.taskDuration || APP_CONST.taskDuration;
  if (!AppState.currentTimerValue || AppState.currentTimerValue <= 0) {
    AppState.currentTimerValue = duration;
  }

  var startClientTime = Date.now();
  var initialTimerVal = AppState.currentTimerValue;

  var circle = $('timerProgress');
  var number = $('timerNumber');
  var circumference = 2 * Math.PI * 52;
  if (circle) {
    circle.style.strokeDasharray = circumference;
  }
  if (number) number.textContent = AppState.currentTimerValue;

  AppState.timerInterval = setInterval(function () {
    var elapsed = Math.floor((Date.now() - startClientTime) / 1000);
    var remaining = initialTimerVal - elapsed;

    var val = remaining > 0 ? remaining : 0;
    AppState.currentTimerValue = val;

    if (number) number.textContent = val;
    var progress = (duration - val) / duration;
    if (circle) circle.style.strokeDashoffset = circumference * Math.min(1, Math.max(0, progress));

    if (circle) {
      if (val <= 5) circle.style.stroke = '#ef4444';
      else if (val <= 15) circle.style.stroke = '#f59e0b';
      else circle.style.stroke = '#22c55e';
    }

    if (val <= 0) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
      var btn = $('btnClaim');
      if (btn) btn.disabled = false;

      if (window.AndroidApp && typeof window.AndroidApp.showCrossButton === 'function') {
        try { window.AndroidApp.showCrossButton(); } catch (e) {}
      }

      showToast(t('msg_timer_finished'), 'success');
    }
  }, 1000);
}

/* ============================================================
   FIX 5: CLAIM REWARD (IMMEDIATE LOCK & ATOMIC TRANSACTIONS)
   ============================================================ */
async function handleClaimReward() {
  if (AppState._isClaiming) return; // Prevent double clicks
  var btn = $('btnClaim');
  if (btn && btn.disabled) return;
  if (!AppState.currentTask || !AppState.user || !AppState.profile) return;

  var duration = Number(AppState.settings.taskDuration) || APP_CONST.taskDuration;
  var currentServerTime = Date.now() + (AppState.serverTimeOffset || 0);
  var elapsedSec = (currentServerTime - (AppState.taskStartTime || 0)) / 1000;

  if (!AppState.taskStartTime || elapsedSec < duration) {
    showToast(t('err_task_time_not_completed'), 'error');
    return;
  }

  AppState._isClaiming = true;
  if (btn) {
    btn.disabled = true;
    setButtonText(btn, t('btn_processing'));
  }

  var task = AppState.currentTask;
  var reward = Number(task.reward) || 0;
  var uid = AppState.user.uid;
  var now = Date.now();

  try {
    var balanceRef = db.ref('users/' + uid + '/balance');
    var totalEarnedRef = db.ref('users/' + uid + '/totalEarned');

    var balResult = await balanceRef.transaction(function (current) {
      return (Number(current) || 0) + reward;
    });

    if (!balResult.committed) throw new Error('Balance update failed');

    await totalEarnedRef.transaction(function (current) {
      return (Number(current) || 0) + reward;
    });

    await db.ref('users/' + uid + '/earnings/' + now).set({
      taskId: task.id,
      taskName: task.title || t('viewer_title'),
      amount: reward,
      timestamp: now
    });

    setCooldown(AppState.settings.cooldownDuration || APP_CONST.cooldown);
    showToast('৳' + formatMoney(reward) + ' ' + t('msg_earned'), 'success');

    if (window.AndroidApp && typeof window.AndroidApp.hideCrossButton === 'function') {
      try { window.AndroidApp.hideCrossButton(); } catch (e) {}
    }

    localStorage.removeItem('activeTask');
    localStorage.removeItem('activeTaskStartTime');

    AppState.currentTask = null;
    AppState.taskStartTime = null;
    AppState.currentTimerValue = 0;
    navigateTo('tasks');
  } catch (err) {
    console.error('[Claim]', err);
    showToast(t('err_claim_failed'), 'error');
    if (btn) btn.disabled = false;
  } finally {
    AppState._isClaiming = false;
    if (btn && AppState.currentTask) setButtonText(btn, t('btn_claim_reward'));
  }
}

/* ============================================================
   COOLDOWN TIMER
   ============================================================ */
function getCooldownKey() {
  var uid = (AppState.user && AppState.user.uid) ? AppState.user.uid : 'guest';
  return APP_CONST.cooldownKey + '_' + uid;
}

function setCooldown(seconds) {
  var until = Date.now() + (seconds * 1000);
  if (AppState.user) {
    db.ref('users/' + AppState.user.uid + '/cooldownUntil').set(until).catch(function () {});
  }
  try { localStorage.setItem(getCooldownKey(), String(until)); } catch (e) {}
}

function getCooldownRemaining() {
  var fromDb = (AppState.profile && AppState.profile.cooldownUntil) || 0;
  var fromLocal = 0;
  try { fromLocal = Number(localStorage.getItem(getCooldownKey()) || 0); } catch (e) {}
  var until = Math.max(fromDb, fromLocal);
  if (!until) return 0;
  var left = Math.ceil((until - Date.now()) / 1000);
  return left > 0 ? left : 0;
}

function showCooldownOverlay(seconds) {
  var overlay = $('cooldownOverlay');
  if (!overlay) return;
  var num = $('cdNumber');
  var circle = $('cdProgress');
  var duration = seconds;
  var circumference = 2 * Math.PI * 42;

  if (circle) {
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = 0;
  }
  if (num) num.textContent = seconds;
  overlay.classList.remove('hidden');

  if (AppState.cdInterval) {
    clearInterval(AppState.cdInterval);
    AppState.cdInterval = null;
  }

  var start = Date.now();
  AppState.cdInterval = setInterval(function () {
    var elapsed = Math.floor((Date.now() - start) / 1000);
    var left = duration - elapsed;
    if (left <= 0) {
      clearInterval(AppState.cdInterval);
      AppState.cdInterval = null;
      overlay.classList.add('hidden');
      return;
    }
    if (num) num.textContent = left;
    var progress = (duration - left) / duration;
    if (circle) circle.style.strokeDashoffset = circumference * progress;
  }, 1000);
}

/* ============================================================
   FIX 5: WITHDRAW LOGIC (IMMEDIATE LOCK & DOUBLE SUBMISSION GUARD)
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
        best = { uid: uid, pendingCount: pc, name: m.name || t('status_moderator'), email: m.email || '' };
      }
    });
    return best;
  } catch (err) {
    console.error('[autoAssignModerator]', err);
    return null;
  }
}

async function handleWithdraw() {
  if (AppState._isWithdrawing) return; // Prevent double clicks
  clearError('wdMessage');

  var uid = AppState.user ? AppState.user.uid : null;
  if (!uid || !AppState.profile) return showError('wdMessage', t('err_no_login'));

  var active = document.querySelector('.method-btn.active');
  var method = active ? active.dataset.method : 'bkash';
  var number = ($('wdNumber').value || '').trim();
  var amount = Number($('wdAmount').value || 0);
  var minWd = AppState.settings.minWithdraw || APP_CONST.minWithdraw;
  var balance = Number(AppState.profile.balance) || 0;

  if (!/^01[3-9]\d{8}$/.test(number)) return showError('wdMessage', t('err_phone'));
  if (!amount || amount < minWd) return showError('wdMessage', t('err_amount_min') + minWd);
  if (amount > balance) return showError('wdMessage', t('err_insufficient_bal'));

  var requiredRefs = AppState.settings.requiredReferrals || 0;
  var have = AppState.profile.referralCount || 0;
  var unlocked = (requiredRefs === 0) || (have >= requiredRefs);

  if (!unlocked) {
    return showError('wdMessage', t('err_ref_required_wd', { need: requiredRefs, have: have }));
  }

  var btn = $('btnWithdraw');
  AppState._isWithdrawing = true;
  if (btn) {
    btn.disabled = true;
    setButtonText(btn, t('btn_processing'));
  }

  try {
    var myWdSnap = await db.ref('withdrawals').orderByChild('uid').equalTo(uid).once('value');
    var myWds = myWdSnap.val() || {};
    var hasPending = Object.keys(myWds).some(function (k) { return myWds[k] && myWds[k].status === 'pending'; });
    if (hasPending) {
      return showError('wdMessage', t('err_pending_wd_exists'));
    }

    var mod = await autoAssignModerator();
    if (!mod) {
      return showError('wdMessage', t('err_no_moderator'));
    }

    // Atomic transaction for balance to prevent double deduction
    var balResult = await db.ref('users/' + uid + '/balance').transaction(function (curr) {
      var currentBal = Number(curr) || 0;
      if (currentBal < amount) return; // Abort
      return currentBal - amount;
    });

    if (!balResult.committed) {
      return showError('wdMessage', t('err_insufficient_bal'));
    }

    var now = Date.now();
    var wdRef = db.ref('withdrawals').push();
    var wdId = wdRef.key;

    var updates = {};
    updates['withdrawals/' + wdId] = {
      uid: uid,
      userName: AppState.profile.name || t('default_username'),
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

    try {
      await db.ref().update(updates);
      showToast(t('msg_wd_success'), 'success');
      $('wdNumber').value = '';
      $('wdAmount').value = '';
      navigateTo('history');
    } catch (writeErr) {
      // Rollback balance on network failure
      await db.ref('users/' + uid + '/balance').transaction(function (curr) {
        return (Number(curr) || 0) + amount;
      }).catch(function () {});
      throw writeErr;
    }
  } catch (err) {
    console.error('[Withdraw]', err);
    showError('wdMessage', t('err_wd_failed'));
  } finally {
    AppState._isWithdrawing = false;
    if (btn) {
      btn.disabled = false;
      setButtonText(btn, t('btn_submit_withdraw'));
    }
  }
}

/* ============================================================
   TRANSACTION HISTORY
   ============================================================ */
function attachHistoryListeners() {
  if (!AppState.user) return;
  detachListener('history');

  var uid = AppState.user.uid;
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
  if (!list) return;
  var tab = AppState.historyTab;

  if (tab === 'earnings') {
    var earnings = (AppState.profile && AppState.profile.earnings) || {};
    var items = Object.keys(earnings).map(function (k) { return earnings[k]; })
      .filter(function (x) { return x; })
      .sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state glass-card neon-border"><p>' + escapeHtml(t('empty_history')) + '</p></div>';
      return;
    }

    list.innerHTML = items.map(function (e) {
      return '<div class="history-item">' +
        '<div class="history-item-left">' +
          '<div class="history-item-title">' + escapeHtml(e.taskName || t('viewer_title')) + '</div>' +
          '<div class="history-item-date">' + formatDate(e.timestamp) + '</div>' +
        '</div>' +
        '<div class="history-item-right">' +
          '<div class="history-item-amount positive">+৳' + formatMoney(e.amount) + '</div>' +
          '<span class="status-badge status-approved">' + escapeHtml(t('status_completed')) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  } else {
    var wds = AppState._withdrawals || {};
    var items2 = Object.keys(wds).map(function (k) { return wds[k]; })
      .filter(function (x) { return x; })
      .sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    if (items2.length === 0) {
      list.innerHTML = '<div class="empty-state glass-card neon-border"><p>' + escapeHtml(t('empty_history')) + '</p></div>';
      return;
    }

    list.innerHTML = items2.map(function (w) {
      var statusClass = w.status === 'approved' ? 'status-approved' : (w.status === 'rejected' ? 'status-rejected' : 'status-pending');
      var statusText = w.status === 'approved' ? t('status_approved') : (w.status === 'rejected' ? t('status_rejected') : t('status_pending'));
      var methodText = w.method === 'bkash' ? t('method_bkash') : t('method_nagad');

      return '<div class="history-item">' +
        '<div class="history-item-left">' +
          '<div class="history-item-title">' + methodText + ' • ' + escapeHtml(w.number || '') + '</div>' +
          '<div class="history-item-date">' + formatDate(w.timestamp) + '</div>' +
        '</div>' +
        '<div class="history-item-right">' +
          '<div class="history-item-amount negative">-৳' + formatMoney(w.amount) + '</div>' +
          '<span class="status-badge ' + statusClass + '">' + statusText + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

/* ============================================================
   MODERATOR PANEL
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
  detachListener('modPanel');

  var uid = AppState.user.uid;
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
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = '<div class="empty-state glass-card neon-border"><p>' + escapeHtml(t('empty_mod_requests')) + '</p></div>';
    return;
  }

  list.innerHTML = items.map(function (w) {
    var methodText = w.method === 'bkash' ? t('method_bkash') : t('method_nagad');
    return '<div class="mod-card glass-card" data-id="' + escapeHtml(w._id) + '">' +
      '<div class="mod-item-head">' +
        '<div class="mod-user">' +
          '<span class="mod-user-name">' + escapeHtml(w.userName || t('default_username')) + '</span>' +
          '<span class="mod-user-contact">' + escapeHtml(w.userEmail || '') + '</span>' +
        '</div>' +
        '<div class="mod-amount glow-text-gold">৳' + formatMoney(w.amount) + '</div>' +
      '</div>' +
      '<div class="mod-details">' +
        '<div class="mod-detail-row"><span>' + t('mod_col_method') + '</span><span>' + methodText + '</span></div>' +
        '<div class="mod-detail-row"><span>' + t('mod_col_number') + '</span><span>' + escapeHtml(w.number || '') + '</span></div>' +
        '<div class="mod-detail-row"><span>' + t('mod_col_time') + '</span><span>' + formatDate(w.timestamp) + '</span></div>' +
      '</div>' +
      '<div class="mod-actions">' +
        '<button class="btn btn-success glass-button neon-glow" data-action="approve" data-id="' + escapeHtml(w._id) + '">' +
          '<span>' + t('btn_approve') + '</span>' +
        '</button>' +
        '<button class="btn btn-danger glass-button" data-action="reject" data-id="' + escapeHtml(w._id) + '">' +
          '<span>' + t('btn_reject') + '</span>' +
        '</button>' +
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
  if (AppState._isModAction) return;
  if (!confirm(t('confirm_approve'))) return;
  if (!AppState.user) return;

  AppState._isModAction = true;
  try {
    var wdSnap = await db.ref('withdrawals/' + wdId).once('value');
    var wd = wdSnap.val();
    if (!wd || wd.status !== 'pending') return showToast('Request is no longer pending', 'warning');
    if (wd.assignedMod !== AppState.user.uid) return showToast('Not assigned to you', 'error');

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
    showToast(t('msg_wd_approved'), 'success');
  } catch (err) {
    console.error('[ModApprove]', err);
    showToast('Approval error', 'error');
  } finally {
    AppState._isModAction = false;
  }
}

async function handleModReject(wdId) {
  if (AppState._isModAction) return;
  var reason = prompt(t('prompt_reject_reason'), '');
  if (reason === null) return;
  if (!AppState.user) return;

  AppState._isModAction = true;
  try {
    var wdSnap = await db.ref('withdrawals/' + wdId).once('value');
    var wd = wdSnap.val();
    if (!wd || wd.status !== 'pending') return showToast('Request is no longer pending', 'warning');
    if (wd.assignedMod !== AppState.user.uid) return showToast('Not assigned to you', 'error');

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
    updates['withdrawals/' + wdId + '/rejectReason'] = reason || 'No reason specified';
    updates['users/' + wd.uid + '/balance'] = newBalance;
    updates['moderators/' + AppState.user.uid + '/pendingCount'] = Math.max(0, currentPc - 1);

    await db.ref().update(updates);
    showToast(t('msg_wd_rejected'), 'info');
  } catch (err) {
    console.error('[ModReject]', err);
    showToast('Rejection error', 'error');
  } finally {
    AppState._isModAction = false;
  }
}

/* ============================================================
   EVENT LISTENERS & BINDINGS
   ============================================================ */
function bindEvents() {
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var refFromUrl = urlParams.get('ref');
    if (refFromUrl) {
      var refInput = $('regReferralCode');
      if (refInput) refInput.value = refFromUrl;
      setTimeout(function () {
        if (!AppState.user) showScreen('screen-register');
      }, APP_CONST.splash + 400);
    }
  } catch (e) { console.warn('URL ref parse error:', e); }

  $all('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.lang;
      if (lang) setLanguage(lang);
    });
  });

  $('btnLogin').addEventListener('click', handleLogin);
  $('btnRegister').addEventListener('click', handleRegister);
  $('btnLogout').addEventListener('click', handleLogout);

  $('linkToRegister').addEventListener('click', function (e) {
    e.preventDefault();
    clearError('regError');
    showScreen('screen-register');
  });

  $('linkToLogin').addEventListener('click', function (e) {
    e.preventDefault();
    clearError('loginError');
    showScreen('screen-login');
  });

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

  // Task Viewer Back button
  $('btnBackFromTask').addEventListener('click', function () {
    if (AppState.timerInterval) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
    }
    localStorage.removeItem('activeTask');
    localStorage.removeItem('activeTaskStartTime');
    AppState.currentTask = null;
    AppState.taskStartTime = null;
    AppState.currentTimerValue = 0;
    if (window.AndroidApp && typeof window.AndroidApp.hideCrossButton === 'function') {
      try { window.AndroidApp.hideCrossButton(); } catch (e) {}
    }
    navigateTo('tasks');
  });

  $('btnOpenLink').addEventListener('click', function () {
    if (!AppState.currentTask || !AppState.currentTask.link) return showToast(t('err_task_not_found'), 'error');
    AppState.linkOpened = true;

    var url = AppState.currentTask.link;
    if (AppState.currentTask.type === 'cpa' && AppState.user) {
      var uid = AppState.user.uid;
      if (url.indexOf('{uid}') !== -1) {
        url = url.replace(/\{uid\}/g, encodeURIComponent(uid));
      } else {
        var separator = url.indexOf('?') !== -1 ? '&' : '?';
        url = url + separator + 'subid=' + encodeURIComponent(uid);
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  $('btnClaim').addEventListener('click', handleClaimReward);

  // FIX 4: Background/Foreground Visibility Sync without interval leaks
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && document.visibilityState === 'visible') {
      if (AppState.currentTask && AppState.currentTask.type === 'timer') {
        var duration = Number(AppState.settings.taskDuration) || APP_CONST.taskDuration;
        var currentServerTime = Date.now() + (AppState.serverTimeOffset || 0);
        var elapsedSec = (currentServerTime - (AppState.taskStartTime || 0)) / 1000;
        var remaining = duration - Math.floor(elapsedSec);

        if (AppState.timerInterval) {
          clearInterval(AppState.timerInterval);
          AppState.timerInterval = null;
        }

        if (remaining <= 0) {
          AppState.currentTimerValue = 0;
          var num = $('timerNumber');
          if (num) num.textContent = '0';
          var circle = $('timerProgress');
          var circumference = 2 * Math.PI * 52;
          if (circle) circle.style.strokeDashoffset = circumference;
          var btnClaim = $('btnClaim');
          if (btnClaim) btnClaim.disabled = false;
          if (window.AndroidApp && typeof window.AndroidApp.showCrossButton === 'function') {
            try { window.AndroidApp.showCrossButton(); } catch (e) {}
          }
        } else {
          AppState.currentTimerValue = remaining;
          startTaskTimer();
        }
      }
    }
  });

  $all('.method-btn').forEach(function (mb) {
    mb.addEventListener('click', function () {
      $all('.method-btn').forEach(function (x) { x.classList.remove('active'); });
      mb.classList.add('active');
    });
  });

  $('btnWithdraw').addEventListener('click', handleWithdraw);

  var btnSkip = $('btnSkipRef');
  if (btnSkip) btnSkip.addEventListener('click', skipReferralPrompt);
  var btnApply = $('btnApplyRef');
  if (btnApply) btnApply.addEventListener('click', applyReferralFromPrompt);

  $all('.history-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $all('.history-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      AppState.historyTab = tab.dataset.tab;
      renderHistory();
    });
  });

  var btnCopy = $('btnCopyRef');
  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      if (!AppState.profile || !AppState.profile.referralCode) return;
      var code = AppState.profile.referralCode;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          showToast(t('msg_copied') + code, 'success');
        }).catch(function () { alert(t('msg_copied') + code); });
      } else {
        alert(t('msg_copied') + code);
      }
    });
  }

  var btnShare = $('btnShareRef');
  if (btnShare) {
    btnShare.addEventListener('click', function () {
      if (!AppState.profile || !AppState.profile.referralCode) return;
      var code = AppState.profile.referralCode;
      var link = window.location.origin + window.location.pathname + '?ref=' + code;
      var text = 'Rx Earn9 এ যোগ দিন! টাস্ক করে আয় করুন।\n\nআমার রেফারেল লিংক: ' + link;
      if (navigator.share) {
        navigator.share({ title: 'Rx Earn9', text: text }).catch(function () {});
      } else {
        alert(text);
      }
    });
  }
}

/* ============================================================
   BOOTSTRAP
   ============================================================ */
(function bootstrap() {
  getOrCreateDeviceId();
  captureRefFromURL();

  document.addEventListener('DOMContentLoaded', function () {
    try {
      var savedLang = localStorage.getItem(APP_CONST.langKey) || 'bn';
      setLanguage(savedLang);
      bindEvents();
    } catch (e) {
      console.error('[Bootstrap init error]', e);
    }
  });

  setTimeout(function () {
    if (!auth || !db) {
      console.error('[Bootstrap] Firebase not ready');
      showError('loginError', 'Firebase লোড হয়নি। ইন্টারনেট চেক করে রিফ্রেশ দিন।');
      return;
    }

    try {
      initAuthListener();
    } catch (e) {
      console.error('[Bootstrap] auth error:', e);
      showError('loginError', 'Auth error: ' + e.message);
    }

    setInterval(function () {
      if (AppState.user) checkModeratorStatus();
    }, 20000);
  }, APP_CONST.splash);
})();