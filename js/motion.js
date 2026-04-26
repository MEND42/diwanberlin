/**
 * js/motion.js — Cafe Diwan Motion System
 * Spring physics + utilities. All animations respect prefers-reduced-motion (WCAG 2.1 SC 2.3.3).
 */

// ── Reduced-motion gate ──────────────────────────────────────────────────────
export const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Spring physics ───────────────────────────────────────────────────────────
/**
 * spring({ from, to, stiffness, damping, onUpdate, onComplete })
 * Returns a cancel() function.
 */
export function spring({
  from = 0,
  to = 1,
  stiffness = 0.1,
  damping = 0.8,
  onUpdate,
  onComplete,
} = {}) {
  if (noMotion) {
    onUpdate?.(to);
    onComplete?.();
    return () => {};
  }

  let value = from;
  let velocity = 0;
  let rafId = null;
  let active = true;

  function tick() {
    if (!active) return;
    const force = (to - value) * stiffness;
    velocity = (velocity + force) * damping;
    value += velocity;

    onUpdate?.(value);

    if (Math.abs(to - value) < 0.001 && Math.abs(velocity) < 0.001) {
      value = to;
      onUpdate?.(value);
      onComplete?.();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
  return () => { active = false; cancelAnimationFrame(rafId); };
}

// ── Linear interpolation ─────────────────────────────────────────────────────
export const lerp = (a, b, t) => a + (b - a) * t;

// ── Count-up animation ───────────────────────────────────────────────────────
export function countUp(el, target, duration = 1800) {
  if (noMotion) { el.textContent = target; return; }
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(ease * target);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// ── Word-split reveal ────────────────────────────────────────────────────────
/**
 * Splits element's text into word spans and returns a function to trigger the reveal.
 * Call prepare() on DOMContentLoaded, call reveal() when element enters viewport.
 */
export function wordReveal(el, { stagger = 40, yFrom = 28, stiffness = 0.14, damping = 0.78 } = {}) {
  if (!el) return { prepare: () => {}, reveal: () => {} };

  function prepare() {
    const text = el.textContent.trim();
    const words = text.split(/\s+/);
    el.innerHTML = words
      .map(w => `<span class="wr-word" style="display:inline-block;overflow:hidden;vertical-align:bottom;">
        <span class="wr-inner" style="display:inline-block;transform:translateY(${yFrom}px);opacity:0;">${w}</span>
      </span>`)
      .join(' ');
  }

  function reveal() {
    if (noMotion) {
      el.querySelectorAll('.wr-inner').forEach(s => {
        s.style.transform = 'translateY(0)';
        s.style.opacity = '1';
      });
      return;
    }
    el.querySelectorAll('.wr-inner').forEach((span, i) => {
      setTimeout(() => {
        spring({
          from: yFrom, to: 0, stiffness, damping,
          onUpdate: v => { span.style.transform = `translateY(${v}px)`; },
        });
        spring({
          from: 0, to: 1, stiffness: stiffness * 1.2, damping,
          onUpdate: v => { span.style.opacity = v; },
        });
      }, i * stagger);
    });
  }

  return { prepare, reveal };
}

// ── Magnetic button ──────────────────────────────────────────────────────────
export function magneticButton(el, { radius = 60, strength = 0.3, stiffness = 0.15, damping = 0.75 } = {}) {
  if (noMotion || !el) return;
  // Only on pointer devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  let cancelX = null, cancelY = null;

  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;

    const targetX = dx * strength;
    const targetY = dy * strength;

    cancelX?.();
    cancelY?.();

    let curX = parseFloat(el.dataset.mx || 0);
    let curY = parseFloat(el.dataset.my || 0);

    cancelX = spring({ from: curX, to: targetX, stiffness, damping,
      onUpdate: v => { el.dataset.mx = v; applyTransform(); }
    });
    cancelY = spring({ from: curY, to: targetY, stiffness, damping,
      onUpdate: v => { el.dataset.my = v; applyTransform(); }
    });
  });

  el.addEventListener('mouseleave', () => {
    cancelX?.();
    cancelY?.();
    const curX = parseFloat(el.dataset.mx || 0);
    const curY = parseFloat(el.dataset.my || 0);
    cancelX = spring({ from: curX, to: 0, stiffness, damping,
      onUpdate: v => { el.dataset.mx = v; applyTransform(); }
    });
    cancelY = spring({ from: curY, to: 0, stiffness, damping,
      onUpdate: v => { el.dataset.my = v; applyTransform(); }
    });
  });

  function applyTransform() {
    const x = parseFloat(el.dataset.mx || 0);
    const y = parseFloat(el.dataset.my || 0);
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
}

// ── Custom cursor ────────────────────────────────────────────────────────────
export function initCursor() {
  // Only on true pointer devices; skip if reduced motion
  if (noMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.createElement('div');
  cursor.id = 'diwan-cursor';
  cursor.style.cssText = `
    position:fixed;
    top:0;left:0;
    width:14px;height:14px;
    border:1.5px solid #c8922a;
    border-radius:50%;
    pointer-events:none;
    z-index:9999;
    transform:translate(-50%,-50%);
    transition:width .2s ease,height .2s ease,opacity .2s ease,background .2s ease;
    opacity:0;
    mix-blend-mode:normal;
  `;
  document.body.appendChild(cursor);

  let mx = 0, my = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursor.style.opacity === '0') cursor.style.opacity = '0.85';
  });

  // Spring-follow loop
  let rafId;
  (function loop() {
    cx = lerp(cx, mx, 0.14);
    cy = lerp(cy, my, 0.14);
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    rafId = requestAnimationFrame(loop);
  })();

  // State morphs
  const HALO  = { width: '40px', height: '40px', background: 'rgba(200,146,42,0.08)' };
  const DOT   = { width: '6px',  height: '6px',  background: 'rgba(200,146,42,0.6)' };
  const DEFAULT = { width: '14px', height: '14px', background: 'transparent' };

  function applyState(state) {
    Object.assign(cursor.style, state);
  }

  document.querySelectorAll('a, button, [role="button"], .btn-g, .ncta, .btn-o, .tab, .mi').forEach(el => {
    el.addEventListener('mouseenter', () => applyState(HALO));
    el.addEventListener('mouseleave', () => applyState(DEFAULT));
  });

  document.querySelectorAll('p, h1, h2, h3, li, span').forEach(el => {
    el.addEventListener('mouseenter', () => applyState(DOT));
    el.addEventListener('mouseleave', () => applyState(DEFAULT));
  });

  document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { cursor.style.opacity = '0.85'; });
}

// ── Parallax sections ────────────────────────────────────────────────────────
export function initParallax(selector = '[data-parallax]') {
  if (noMotion) return;
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    els.forEach(el => {
      const factor = parseFloat(el.dataset.parallax || 0.15);
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - window.innerHeight / 2) * factor;
      el.style.transform = `translateY(${offset}px)`;
    });
  }, { passive: true });
}

// ── Intersection-based counter triggers ──────────────────────────────────────
export function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        countUp(e.target, parseInt(e.target.dataset.count), 1600);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}
