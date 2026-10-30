/**
 * API routes — STEP 0 STUB (owned by Session B from Phase 1).
 * Minimal but contract-correct, so the web app can be built against it.
 */
import {
  EventInputSchema,
  RefineRequestSchema,
  type PlanResponse,
  type RefineResponse,
} from '@utsav/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { sendError } from '../middleware/errors.js';
import { applyPatch, buildPlan, generateIdeas, interpretRefinement } from '../ports.js';

export const apiRouter = Router();

apiRouter.post('/plan', async (req, res) => {
  const parsed = EventInputSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const plan = buildPlan(parsed.data, new Date());
  const { ideas, aiStatus } = await generateIdeas(parsed.data, plan);
  const body: PlanResponse = { plan, ideas, aiStatus };
  res.json(body);
});

apiRouter.post('/refine', async (req, res) => {
  const parsed = RefineRequestSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);
  const { patch, explanation } = await interpretRefinement(parsed.data.input, parsed.data.message);
  const input = applyPatch(parsed.data.input, patch);
  const plan = buildPlan(input, new Date());
  const { ideas, aiStatus } = await generateIdeas(input, plan);
  const body: RefineResponse = { patch, explanation, result: { plan, ideas, aiStatus } };
  res.json(body);
});

function sendValidationError(res: Parameters<typeof sendError>[0], error: z.ZodError): void {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  sendError(res, 400, 'VALIDATION', 'Some details need fixing.', issues);
}
