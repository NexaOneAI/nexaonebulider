/**
 * Tests for previewLogsStore — verify FIFO retention so the buffer
 * doesn't grow without bound during long preview sessions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePreviewLogsStore } from './previewLogsStore';

const MAX = 200;

describe('previewLogsStore', () => {
  beforeEach(() => {
    usePreviewLogsStore.getState().clear();
  });

  it('appends events and assigns ids', () => {
    usePreviewLogsStore.getState().push({ type: 'console', level: 'log', message: 'hello' });
    const events = usePreviewLogsStore.getState().events;
    expect(events).toHaveLength(1);
    expect(events[0].id).toBeTruthy();
    expect(events[0].at).toBeGreaterThan(0);
  });

  it('drops oldest entries once over MAX (FIFO)', () => {
    const push = usePreviewLogsStore.getState().push;
    for (let i = 0; i < MAX + 50; i++) {
      push({ type: 'console', level: 'log', message: `msg-${i}` });
    }
    const events = usePreviewLogsStore.getState().events;
    expect(events).toHaveLength(MAX);
    // Oldest 50 should have been dropped
    expect((events[0] as { message: string }).message).toBe('msg-50');
    expect((events[events.length - 1] as { message: string }).message).toBe(`msg-${MAX + 49}`);
  });

  it('counts console levels', () => {
    const push = usePreviewLogsStore.getState().push;
    push({ type: 'console', level: 'log', message: 'a' });
    push({ type: 'console', level: 'warn', message: 'b' });
    push({ type: 'console', level: 'warn', message: 'c' });
    push({ type: 'console', level: 'error', message: 'd' });
    const c = usePreviewLogsStore.getState().consoleCount();
    expect(c).toEqual({ log: 1, warn: 2, error: 1 });
  });

  it('counts network ok vs failed', () => {
    const push = usePreviewLogsStore.getState().push;
    push({ type: 'network', method: 'GET', url: '/a', status: 200, ok: true });
    push({ type: 'network', method: 'GET', url: '/b', status: 500 });
    push({ type: 'network', method: 'GET', url: '/c', error: 'timeout' });
    const c = usePreviewLogsStore.getState().networkCount();
    expect(c).toEqual({ ok: 1, failed: 2 });
  });

  it('clear empties the buffer', () => {
    usePreviewLogsStore.getState().push({ type: 'console', level: 'log', message: 'x' });
    usePreviewLogsStore.getState().clear();
    expect(usePreviewLogsStore.getState().events).toHaveLength(0);
  });
});
