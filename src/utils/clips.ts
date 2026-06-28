import type { VideoClip } from "../types/clip";

const DEFAULT_CLIP_SECONDS = 15;

export function createClipId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeClipInterval(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  const boundedStart = Math.max(0, start);
  const maxEnd = duration > 0 ? duration : Math.max(end, boundedStart + 1);
  const boundedEnd = Math.min(Math.max(end, boundedStart + 1), maxEnd);

  return {
    start: boundedStart,
    end: boundedEnd,
  };
}

export function createClip(
  start = 0,
  end = DEFAULT_CLIP_SECONDS,
  duration = 0,
): VideoClip {
  const normalized = normalizeClipInterval(start, end, duration);
  return {
    id: createClipId(),
    ...normalized,
  };
}

export function createDefaultClips(duration = 0): VideoClip[] {
  const end = duration > 0 ? Math.min(DEFAULT_CLIP_SECONDS, duration) : DEFAULT_CLIP_SECONDS;
  return [createClip(0, end, duration)];
}
