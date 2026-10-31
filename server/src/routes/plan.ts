import { PlanRequestSchema, resolveToday, type PlanResponse } from '@utsav/shared';
import type { RequestHandler } from 'express';
import { buildPlan, generateIdeas } from '../ports.js';
import { now } from './clock.js';
import { abortOnDisconnect, parseBody, pastDateIssue, sendValidationError } from './validate.js';

/** POST /plan: validate → engine plan (numbers, dates) → AI ideas (or fallback). */
export const postPlan: RequestHandler = async (req, res) => {
  const request = parseBody(PlanRequestSchema, req.body, res);
  if (!request) return;
  // clientToday only picks the calendar day; the engine and AI get a pure EventInput.
  const { clientToday, ...input } = request;
  const today = resolveToday(clientToday, now());
  const dateIssue = pastDateIssue(input.eventDate, today);
  if (dateIssue) return sendValidationError(res, [dateIssue]);

  const plan = buildPlan(input, today);
  const { ideas, aiStatus } = await generateIdeas(input, plan, { signal: abortOnDisconnect(res) });
  const body: PlanResponse = { plan, ideas, aiStatus };
  res.json(body);
};
