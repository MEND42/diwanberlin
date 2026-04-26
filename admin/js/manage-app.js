import { verifySession, logout } from './core.js';

const session = await verifySession(['OWNER', 'MANAGER', 'WAITER']);

if (session) {
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const target = prompt('Befehl oder Ziel öffnen', 'Tische');
      if (!target) return;
      const normalized = target.toLowerCase();
      if (normalized.includes('küche') || normalized.includes('kitchen')) location.href = '/admin-v2/kitchen';
      if (normalized.includes('service')) location.href = '/admin-v2/service';
    }
  });
}

window.diwanLogout = logout;
