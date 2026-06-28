import { useMemo, useState, type MouseEvent } from "react";
import type { VideoClip } from "../types/clip";
import { formatSeconds } from "../utils/time";

interface ClipTimelineProps {
  duration: number;
  start: number;
  end: number;
  currentTime: number;
  backgroundClips?: VideoClip[];
  activeClipId?: string;
  disabled?: boolean;
  onChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

const MIN_CLIP_SECONDS = 1;
const ZOOM_LEVELS = [1, 2, 4, 8, 16, 32] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ClipTimeline({
  duration,
  start,
  end,
  currentTime,
  backgroundClips = [],
  activeClipId,
  disabled = false,
  onChange,
  onSeek,
}: ClipTimelineProps) {
  const max = Math.max(duration, 1);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [viewCenter, setViewCenter] = useState<number | null>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const visibleDuration = Math.max(MIN_CLIP_SECONDS * 2, max / zoom);
  const selectionCenter = (start + end) / 2;

  const { viewStart, viewEnd } = useMemo(() => {
    const center = viewCenter ?? selectionCenter;
    let startAt = center - visibleDuration / 2;
    startAt = clamp(startAt, 0, Math.max(0, max - visibleDuration));
    const endAt = Math.min(max, startAt + visibleDuration);
    return { viewStart: startAt, viewEnd: endAt };
  }, [viewCenter, selectionCenter, visibleDuration, max]);

  const viewportSpan = Math.max(viewEnd - viewStart, MIN_CLIP_SECONDS);
  const step =
    zoom <= 1 ? 1 : Math.max(0.1, Math.round((viewportSpan / 400) * 10) / 10);

  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  const canPanLeft = viewStart > 0.05;
  const canPanRight = viewEnd < max - 0.05;

  const toViewportPercent = (time: number) =>
    clamp(((time - viewStart) / viewportSpan) * 100, 0, 100);

  const startPercent = toViewportPercent(start);
  const endPercent = toViewportPercent(end);
  const playheadPercent = toViewportPercent(currentTime);

  const tickMarks = useMemo(() => {
    const count = zoom >= 8 ? 8 : zoom >= 4 ? 6 : 4;
    return Array.from({ length: count + 1 }, (_, index) => {
      const time = viewStart + (viewportSpan / count) * index;
      return {
        time,
        label: formatSeconds(Math.round(time * 10) / 10),
        left: (index / count) * 100,
      };
    });
  }, [viewStart, viewportSpan, zoom]);

  const handleStartChange = (value: number) => {
    const nextStart = Math.min(value, end - MIN_CLIP_SECONDS);
    onChange(clamp(nextStart, 0, max), end);
  };

  const handleEndChange = (value: number) => {
    const nextEnd = Math.max(value, start + MIN_CLIP_SECONDS);
    onChange(start, clamp(nextEnd, 0, max));
  };

  const handleTrackClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const time = viewStart + ratio * viewportSpan;
    const rounded = Math.round(time / step) * step;
    onSeek(clamp(rounded, 0, max));
  };

  const zoomIn = () => {
    if (!canZoomIn) return;
    setViewCenter(selectionCenter);
    setZoomIndex((current) => Math.min(current + 1, ZOOM_LEVELS.length - 1));
  };

  const zoomOut = () => {
    if (!canZoomOut) return;
    setViewCenter(selectionCenter);
    setZoomIndex((current) => Math.max(current - 1, 0));
  };

  const pan = (direction: -1 | 1) => {
    const shift = viewportSpan * 0.35 * direction;
    const nextCenter = clamp(
      (viewCenter ?? selectionCenter) + shift,
      viewportSpan / 2,
      max - viewportSpan / 2,
    );
    setViewCenter(nextCenter);
  };

  const inactiveClips = backgroundClips.filter((clip) => clip.id !== activeClipId);

  return (
    <div className={`clip-timeline${disabled ? " is-disabled" : ""}`}>
      <div className="clip-timeline-toolbar">
        <div className="clip-timeline-zoom">
          <button
            type="button"
            className="clip-timeline-icon-btn"
            onClick={zoomOut}
            disabled={disabled || !canZoomOut}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <span className="clip-timeline-icon" aria-hidden="true">
              🔍−
            </span>
          </button>
          <span className="clip-timeline-zoom-label">{zoom}x</span>
          <button
            type="button"
            className="clip-timeline-icon-btn"
            onClick={zoomIn}
            disabled={disabled || !canZoomIn}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <span className="clip-timeline-icon" aria-hidden="true">
              🔍+
            </span>
          </button>
        </div>

        {zoom > 1 && (
          <div className="clip-timeline-pan">
            <button
              type="button"
              className="clip-timeline-icon-btn"
              onClick={() => pan(-1)}
              disabled={disabled || !canPanLeft}
              aria-label="Mover timeline para trás"
            >
              ←
            </button>
            <button
              type="button"
              className="clip-timeline-icon-btn"
              onClick={() => pan(1)}
              disabled={disabled || !canPanRight}
              aria-label="Mover timeline para frente"
            >
              →
            </button>
          </div>
        )}

        <span className="clip-timeline-viewport">
          Visível: {formatSeconds(viewStart)} – {formatSeconds(viewEnd)}
        </span>
      </div>

      <div className="clip-timeline-track" onClick={handleTrackClick}>
        <div className="clip-timeline-rail" />
        {inactiveClips.map((clip) => {
          const clipStart = toViewportPercent(clip.start);
          const clipEnd = toViewportPercent(clip.end);
          return (
            <div
              key={clip.id}
              className="clip-timeline-selection clip-timeline-selection--background"
              style={{
                left: `${clipStart}%`,
                width: `${Math.max(0, clipEnd - clipStart)}%`,
              }}
            />
          );
        })}
        <div
          className="clip-timeline-selection"
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        />
        <div
          className="clip-timeline-handle clip-timeline-handle--start"
          style={{ left: `${startPercent}%` }}
          aria-hidden="true"
        />
        <div
          className="clip-timeline-handle clip-timeline-handle--end"
          style={{ left: `${endPercent}%` }}
          aria-hidden="true"
        />
        <div
          className="clip-timeline-playhead"
          style={{ left: `${playheadPercent}%` }}
          aria-hidden="true"
        />
        <input
          type="range"
          className="clip-timeline-input clip-timeline-input--start"
          min={viewStart}
          max={viewEnd}
          step={step}
          value={start}
          disabled={disabled}
          aria-label="Início do corte"
          onChange={(event) => handleStartChange(Number(event.target.value))}
        />
        <input
          type="range"
          className="clip-timeline-input clip-timeline-input--end"
          min={viewStart}
          max={viewEnd}
          step={step}
          value={end}
          disabled={disabled}
          aria-label="Fim do corte"
          onChange={(event) => handleEndChange(Number(event.target.value))}
        />
      </div>

      <div className="clip-timeline-labels">
        {tickMarks.map((tick, index) => (
          <span key={`${tick.time}-${index}`} style={{ left: `${tick.left}%` }}>
            {tick.label}
          </span>
        ))}
      </div>

      <div className="clip-timeline-handles">
        <span>Início: {formatSeconds(start)}</span>
        <span>Fim: {formatSeconds(end)}</span>
        <span>Duração: {formatSeconds(Math.max(0, end - start))}</span>
        {zoom > 1 && <span>Precisão: {step}s</span>}
      </div>
    </div>
  );
}
