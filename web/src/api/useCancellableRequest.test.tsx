import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlannerError } from './client';
import { useCancellableRequest } from './useCancellableRequest';

describe('useCancellableRequest', () => {
  it('turns an unexpected failure into a friendly error that keeps its arguments', async () => {
    const run = vi.fn((_args: string) => Promise.reject(new TypeError('boom')));
    const { result } = renderHook(() => useCancellableRequest(run, vi.fn()));
    await act(() => result.current.submit('cut 20%'));
    const state = result.current.state;
    expect(state).toMatchObject({ status: 'error', args: 'cut 20%' });
    if (state.status !== 'error') throw new Error('expected an error state');
    expect(state.error).toBeInstanceOf(PlannerError);
    expect(state.error.code).toBe('INTERNAL');
  });

  it('keeps a PlannerError from the API as it is', async () => {
    const apiError = new PlannerError('Too many requests', 'RATE_LIMITED');
    const run = vi.fn((_args: number) => Promise.reject(apiError));
    const { result } = renderHook(() => useCancellableRequest(run, vi.fn()));
    await act(() => result.current.submit(1));
    expect(result.current.state).toEqual({ status: 'error', error: apiError, args: 1 });
  });

  it('drops the result and the error of a cancelled request', async () => {
    let settle: (ok: boolean) => void = () => undefined;
    const run = vi.fn(
      (_args: string) =>
        new Promise<string>((resolve, reject) => {
          settle = (ok) => (ok ? resolve('plan') : reject(new Error('aborted')));
        }),
    );
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useCancellableRequest(run, onSuccess));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.submit('a');
    });
    expect(result.current.state.status).toBe('loading');
    act(() => result.current.cancel());
    await act(async () => {
      settle(true);
      await pending;
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');

    act(() => {
      pending = result.current.submit('b');
    });
    act(() => result.current.cancel());
    await act(async () => {
      settle(false);
      await pending;
    });
    expect(result.current.state.status).toBe('idle');
  });

  it('reports success to the caller', async () => {
    const onSuccess = vi.fn();
    const run = (n: number) => Promise.resolve(n * 2);
    const { result } = renderHook(() => useCancellableRequest(run, onSuccess));
    await act(() => result.current.submit(21));
    expect(onSuccess).toHaveBeenCalledWith(42);
    expect(result.current.state.status).toBe('idle');
  });
});
