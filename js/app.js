// app.js — Utilitários globais e inicialização comum a todas as páginas

document.addEventListener('DOMContentLoaded', () => {
  const pagina = window.location.pathname.split('/').pop() || 'index.html';
  const publica = pagina === 'index.html' || pagina === '';

  // 1. Se não está logado e não é index.html → redireciona para index.html
  if (!publica && !Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // 2. Se admin → mostra link #nav-admin
  if (Auth.isAdmin()) {
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) navAdmin.style.display = '';
  }

  // 3. Inicializa toasts container no body
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
});

// ─── TOAST ────────────────────────────────────────────────────────────────────

function showToast(mensagem, tipo = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast ' + tipo;
  toast.textContent = mensagem;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }, 3000);
}

// ─── LOADING OVERLAY ─────────────────────────────────────────────────────────

function showLoading() {
  if (document.getElementById('loading-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  overlay.appendChild(spinner);
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.parentNode.removeChild(overlay);
}

// ─── SANITIZAÇÃO (previne XSS) ───────────────────────────────────────────────

function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatarTier(tier) {
  return 'T' + tier;
}

function getTierColor(tier) {
  const cores = {
    1: '#FFD700',
    2: '#C0C0C0',
    3: '#CD7F32',
    4: '#4CAF50',
    5: '#2196F3'
  };
  return cores[tier] || '#fff';
}
