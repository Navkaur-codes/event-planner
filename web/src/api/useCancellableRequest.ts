import { useCallback, useEffect, useRef, useState } from 'react';
import { PlannerError } from './client';

export type RequestState<TArgs> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: PlannerError; args: TArgs };

/**
 * Runs an API call with an AbortController so the person can cancel it; a new call or
 * unmounting aborts the previous one. Failures keep their arguments for "Try again".
 * `run` must be stable (a module-level function).
 */
export function useCancellableRequest<TArgs, TResult>(
  run: (args: TArgs, signal: AbortSignal) => Promise<TResult>,
  onSuccess: (result: TResult) => void,
) {
  const [state, setState] = useState<RequestState<TArgs>>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = useCallback(
    async (args: TArgs) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: 'loading' });
      try {
        const result = await run(args, controller.signal);
        if (controller.signal.aborted) return;
        setState({ status: 'idle' });
        onSuccess(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        const friendly =
          error instanceof PlannerError
            ? error
            : new PlannerError('Something went wrong. Please try again.', 'INTERNAL');
        setState({ status: 'error', error: friendly, args });
      }
    },
    [run, onSuccess],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, submit, cancel };
}
