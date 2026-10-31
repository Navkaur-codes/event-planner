/** Lazy access to the GSAP motion chunk so it never weighs on the first page load. */
import type * as MotionModule from './index';

type Motion = typeof MotionModule;

let loaded: Motion | null = null;
let pending: Promise<Motion> | null = null;

/** Starts (or reuses) the download of the motion chunk. */
export function loadMotion(): Promise<Motion> {
  pending ??= import('./index').then((motion) => (loaded = motion));
  return pending;
}

/** The motion module if it has finished loading, so callers can animate synchronously. */
export function motionIfLoaded(): Motion | null {
  return loaded;
}
