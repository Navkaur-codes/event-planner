import { RefineRequestSchema, type RefineResponse } from '@utsav/shared';
import type { RequestHandler } from 'express';
import { applyPatch, buildPlan, generateIdeas, interpretRefinement } from '../ports.js';
import { now } from './clock.js';
import { abortOnDisconnect, parseBody, pastDateIssue, sendValidationError } from './validate.js';

/** POST /refine: message → structured patch → new engine plan → ideas. */
export const postRefine: RequestHandler = async (req, res) => {
  const request = parseBody(RefineRequestSchema, req.body, res);
  if (!request) return;
  const today = now();
  const signal = abortOnDisconnect(res);

  const { patch, explanation } = await interpretRefinement(request.input, request.message, {
    signal,
  });
  const input = applyPatch(request.input, patch);
  const dateIssue = pastDateIssue(input.eventDate, today, 'input.eventDate');
  if (dateIssue) return sendValidationError(res, [dateIssue]);

  const plan = buildPlan(input, today);
  const { ideas, aiStatus } = await generateIdeas(input, plan, { signal });
  const body: RefineResponse = { patch, explanation, result: { plan, ideas, aiStatus } };
  res.json(body);
};
