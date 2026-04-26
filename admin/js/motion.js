const springs = {
  snap: { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' },
  gentle: { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' },
  bounce: { duration: 420, easing: 'cubic-bezier(.2,1.4,.3,1)' },
  swoosh: { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }
};

export function spring(element, keyframes, name = 'gentle') {
  if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return element.animate(keyframes, { ...springs[name], fill: 'both' });
}

export function transition(callback) {
  if (document.startViewTransition) return document.startViewTransition(callback);
  callback();
  return null;
}
