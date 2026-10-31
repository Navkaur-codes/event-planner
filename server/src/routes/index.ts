/**
 * API routes (mounted by Main at /api). Engine and AI are reached only through ports.
 */
import { Router } from 'express';
import { postPlan } from './plan.js';
import { postRefine } from './refine.js';

export const apiRouter = Router();

apiRouter.post('/plan', postPlan);
apiRouter.post('/refine', postRefine);
