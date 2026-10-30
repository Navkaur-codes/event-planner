/**
 * Ports: the single place the server reaches cross-session code.
 * Step 0 ships stubs at each path; owners replace them and flip IMPLEMENTATION to "real".
 */
import { ENGINE_IMPLEMENTATION, type HealthResponse } from '@utsav/shared';
import { IMPLEMENTATION as AI_IMPLEMENTATION } from './ai/index.js';

export { applyPatch, buildPlan, recalculateBudget } from '@utsav/shared';
export { fallbackIdeas, generateIdeas, interpretRefinement } from './ai/index.js';

/** Reports which ports are real implementations and which are still stubs. */
export function portStatus(): HealthResponse['ports'] {
  return { engine: ENGINE_IMPLEMENTATION, ai: AI_IMPLEMENTATION };
}
