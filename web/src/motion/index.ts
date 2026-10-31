/**
 * The only place GSAP is used, for the four moments where motion carries meaning:
 * wizard step change, plan reveal, confetti for a first plan and a finished checklist.
 * Every animation runs inside `gsap.matchMedia()`; the reduced-motion branch shows the
 * final state instantly. Each helper returns a cleanup that reverts its tweens.
 */
import { gsap } from 'gsap';

type Cleanup = () => void;

const NO_MOTION: Cleanup = () => undefined;
const CONFETTI_COLOURS = ['#FFB627', '#E5446D', '#3DCCC7', '#1B6F8C', '#F25C2A', '#EADCF8'];

/** Runs `animate` only when the person has not asked for reduced motion. */
function withMotion(animate: () => Cleanup | undefined): Cleanup {
  if (typeof window.matchMedia !== 'function') return NO_MOTION;
  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduced: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      if (context.conditions?.reduced) return undefined;
      return animate();
    },
  );
  return () => mm.revert();
}

/** Slides the new wizard step in from the direction of travel. */
export function stepTransition(element: HTMLElement, direction: 1 | -1): Cleanup {
  return withMotion(() => {
    gsap.from(element, {
      x: 32 * direction,
      autoAlpha: 0,
      duration: 0.32,
      ease: 'power2.out',
      clearProps: 'transform,opacity,visibility',
    });
    return undefined;
  });
}

/** Grows the budget bars and staggers the timeline in, once per plan view. */
export function revealPlan(root: HTMLElement, options: { confetti: boolean }): Cleanup {
  return withMotion(() => {
    gsap.from(root.querySelectorAll('[data-reveal="bar"]'), {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.06,
    });
    gsap.from(root.querySelectorAll('[data-reveal="milestone"]'), {
      y: 18,
      autoAlpha: 0,
      duration: 0.45,
      ease: 'power2.out',
      stagger: 0.08,
      delay: 0.2,
    });
    return options.confetti ? burstConfetti() : undefined;
  });
}

/** Confetti for a finished checklist (nothing with reduced motion). */
export function celebrate(): Cleanup {
  return withMotion(burstConfetti);
}

/** A short burst of paper confetti from the top of the screen; decorative only. */
function burstConfetti(): Cleanup {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 70; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length] ?? '#FFB627';
    piece.style.left = `${gsap.utils.random(0, 100)}%`;
    layer.append(piece);
  }
  document.body.append(layer);

  gsap.fromTo(
    layer.children,
    { y: -40, rotation: 0 },
    {
      y: () => window.innerHeight + gsap.utils.random(0, 200),
      x: () => gsap.utils.random(-120, 120),
      rotation: () => gsap.utils.random(-540, 540),
      duration: () => gsap.utils.random(1.8, 3),
      ease: 'power1.in',
      stagger: 0.01,
      onComplete: () => layer.remove(),
    },
  );
  return () => layer.remove();
}
