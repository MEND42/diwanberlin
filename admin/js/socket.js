export function createSocket(statusEl, handlers = {}) {
  if (typeof io !== 'function') {
    setStatus(statusEl, 'offline');
    return null;
  }

  const socket = io();
  socket.on('connect', () => setStatus(statusEl, 'live'));
  socket.on('disconnect', () => setStatus(statusEl, 'offline'));
  socket.io?.on('reconnect_attempt', () => setStatus(statusEl, 'reconnecting'));

  Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
  return socket;
}

export function setStatus(statusEl, status) {
  if (!statusEl) return;
  statusEl.className = `live-badge ${status}`;
  statusEl.textContent = status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Offline';
}
