import { pulse } from './haptics.js';

export function installHoldButtons(root = document) {
  root.querySelectorAll('[data-hold-action]').forEach(button => {
    if (button.dataset.holdReady) return;
    button.dataset.holdReady = 'true';
    let timer;
    const clear = () => {
      clearTimeout(timer);
      button.classList.remove('holding');
    };
    const start = () => {
      pulse('tap');
      button.classList.add('holding');
      timer = setTimeout(() => {
        button.dispatchEvent(new CustomEvent('holdcommit', { bubbles: true }));
        pulse('success');
        clear();
      }, 600);
    };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', clear);
    button.addEventListener('pointerleave', clear);
    button.addEventListener('pointercancel', clear);
  });
}

export function openSheet(contentHtml) {
  const backdrop = document.getElementById('sheet');
  const content = document.getElementById('sheet-content');
  if (!backdrop || !content) return;
  content.innerHTML = contentHtml;
  backdrop.classList.add('open');
  pulse('tap');
}

export function closeSheet() {
  document.getElementById('sheet')?.classList.remove('open');
}

export function createSwipeRow({ content, leftLabel = 'Assign', rightLabel = 'Confirm' }) {
  const row = document.createElement('div');
  row.className = 'swipe-row';
  row.innerHTML = `
    <div class="swipe-action left">${leftLabel}</div>
    <div class="swipe-action right">${rightLabel}</div>
    <div class="swipe-content">${content}</div>
  `;
  let startX = 0;
  let currentX = 0;
  const contentEl = row.querySelector('.swipe-content');
  row.addEventListener('pointerdown', event => {
    startX = event.clientX;
    row.setPointerCapture?.(event.pointerId);
  });
  row.addEventListener('pointermove', event => {
    if (!startX) return;
    currentX = Math.max(-96, Math.min(96, event.clientX - startX));
    contentEl.style.transform = `translateX(${currentX}px)`;
  });
  row.addEventListener('pointerup', () => {
    if (currentX > 72) row.dispatchEvent(new CustomEvent('swiperight', { bubbles: true }));
    if (currentX < -72) row.dispatchEvent(new CustomEvent('swipeleft', { bubbles: true }));
    startX = 0;
    currentX = 0;
    contentEl.style.transform = '';
  });
  return row;
}

export function numberPad(onInput) {
  const pad = document.createElement('div');
  pad.className = 'number-pad';
  pad.innerHTML = ['1','2','3','4','5','6','7','8','9','00','0','⌫'].map(key => `<button>${key}</button>`).join('');
  pad.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    pulse('tap');
    onInput(button.textContent);
  });
  return pad;
}
