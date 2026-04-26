const patterns = {
  tap: 8,
  success: [10, 35, 18],
  error: 90
};

export function pulse(type = 'tap') {
  if (!('vibrate' in navigator)) return;
  if (localStorage.getItem('diwanHaptics') === 'off') return;
  navigator.vibrate(patterns[type] || patterns.tap);
}
