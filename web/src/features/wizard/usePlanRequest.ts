import type { EventInput, PlanResponse } from '@utsav/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlan, PlannerError } from '../../api/client';

export type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: PlannerError; input: EventInput };

/**
 * Sends `POST /api/plan` with an AbortController so the person can cancel; the
 * request is also aborted when the wizard unmounts.
 */
export function usePlanRequest(onSuccess: (response: PlanResponse) => void) {
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = useCallback(
    async (input: EventInput) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: 'loading' });
      try {
        const response = await createPlan(input, controller.signal);
        if (!controller.signal.aborted) onSuccess(response);
      } catch (error) {
        if (controller.signal.aborted) return;
        const friendly =
          error instanceof PlannerError
            ? error
            : new PlannerError('Something went wrong. Please try again.', 'INTERNAL');
        setState({ status: 'error', error: friendly, input });
      }
    },
    [onSuccess],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, submit, cancel };
}
