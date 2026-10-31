import { afterEach, describe, expect, it, vi } from 'vitest';
import { countUp, revealPlan, stepTransition } from './index';

/** Fakes `prefers-reduced-motion` for gsap.matchMedia. */
function preferReducedMotion(reduced: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.endsWith('reduce)') ? reduced : !reduced,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

function planRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = '<span data-reveal="bar"></span><li data-reveal="milestone"></li>';
  document.body.append(root);
  return root;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('motion', () => {
  it('celebrates the first plan with confetti and cleans it up', () => {
    preferReducedMotion(false);
    const cleanup = revealPlan(planRoot(), { confetti: true });
    expect(document.querySelector('.confetti-layer')).not.toBeNull();
    cleanup();
    expect(document.querySelector('.confetti-layer')).toBeNull();
  });

  it('shows everything instantly when reduced motion is preferred', () => {
    preferReducedMotion(true);
    const root = planRoot();
    const cleanup = revealPlan(root, { confetti: true });
    expect(document.querySelector('.confetti-layer')).toBeNull();
    const bar = root.querySelector<HTMLElement>('[data-reveal="bar"]');
    expect(bar?.style.transform ?? '').toBe('');

    const step = document.createElement('div');
    stepTransition(step, 1)();
    expect(step.style.opacity).toBe('');
    cleanup();
  });

  it('counts the what-if total up, and just shows it with reduced motion', () => {
    const format = (value: number) => `₹${value}`;
    const element = document.createElement('span');

    preferReducedMotion(true);
    countUp(element, 100, 500, format)();
    expect(element.textContent).toBe('₹500');

    preferReducedMotion(false);
    const cleanup = countUp(element, 500, 900, format);
    expect(element.textContent).not.toBe('');
    cleanup();
    expect(element.textContent).toBe('₹900');
  });
});
