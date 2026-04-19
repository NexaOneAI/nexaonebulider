/**
 * Tests for the stream-edit strategy preference module.
 * Verifies localStorage round-trip, default, and subscription fan-out.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStreamEditStrategy,
  setStreamEditStrategy,
  subscribeStreamEditStrategy,
} from './streamPrefs';

describe('streamPrefs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to "progressive" when nothing is stored', () => {
    expect(getStreamEditStrategy()).toBe('progressive');
  });

  it('persists and reads back tokens-only', () => {
    setStreamEditStrategy('tokens-only');
    expect(getStreamEditStrategy()).toBe('tokens-only');
    expect(window.localStorage.getItem('nexa.streamEditStrategy')).toBe('tokens-only');
  });

  it('falls back to default when stored value is garbage', () => {
    window.localStorage.setItem('nexa.streamEditStrategy', 'banana');
    expect(getStreamEditStrategy()).toBe('progressive');
  });

  it('notifies subscribers when value changes', () => {
    const cb = vi.fn();
    const unsubscribe = subscribeStreamEditStrategy(cb);

    setStreamEditStrategy('tokens-only');
    expect(cb).toHaveBeenCalledWith('tokens-only');

    setStreamEditStrategy('progressive');
    expect(cb).toHaveBeenCalledWith('progressive');
    expect(cb).toHaveBeenCalledTimes(2);

    unsubscribe();
    setStreamEditStrategy('tokens-only');
    expect(cb).toHaveBeenCalledTimes(2); // no further calls after unsub
  });
});
