/**
 * API routes (mounted by Main at /api). Engine and AI are reached only through ports.
 */
import { Router } from 'express';
import { postPlan } from './plan.js';
import { postRefine } from './refine.js';

/** POST /plan and POST /refine; Main mounts it at /api behind rate limiting. */
export const apiRouter = Router();

apiRouter.post('/plan', postPlan);
apiRouter.post('/refine', postRefine);
