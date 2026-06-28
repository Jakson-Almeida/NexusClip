import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { ClipAspectRatio } from "../types/clip";
import { formatOutputSummary } from "../constants/outputFormats";
import {
  clamp01,
  focusFromOverlayRect,
  getCropOverlayRect,
  type CropOverlayRect,
} from "../utils/crop";

interface FormatPreviewOverlayProps {
  aspectRatio: ClipAspectRatio;
  outputHeight: number;
  focusX: number;
  focusY: number;
  disabled?: boolean;
  onFocusChange: (focusX: number, focusY: number) => void;
}

export default function FormatPreviewOverlay({
  aspectRatio,
  outputHeight,
  focusX,
  focusY,
  disabled = false,
  onFocusChange,
}: FormatPreviewOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ rect: CropOverlayRect; axis: "x" | "y" | "both" } | null>(
    null,
  );

  const cropRect = useMemo(
    () => getCropOverlayRect(aspectRatio, focusX, focusY),
    [aspectRatio, focusX, focusY],
  );

  if (!cropRect || aspectRatio === "original") {
    return null;
  }

  const summary = formatOutputSummary(aspectRatio, outputHeight as 1080 | 720 | 480);

  const updateFocusFromPointer = (clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    const dragState = dragStateRef.current;
    if (!overlay || !dragState) return;

    const bounds = overlay.getBoundingClientRect();
    const nextRect = { ...dragState.rect };

    if (dragState.axis === "x" || dragState.axis === "both") {
      const pointerX = ((clientX - bounds.left) / bounds.width) * 100;
      nextRect.left = clamp01(
        (pointerX - nextRect.width / 2) / Math.max(100 - nextRect.width, 1),
      ) * Math.max(100 - nextRect.width, 0);
    }

    if (dragState.axis === "y" || dragState.axis === "both") {
      const pointerY = ((clientY - bounds.top) / bounds.height) * 100;
      nextRect.top = clamp01(
        (pointerY - nextRect.height / 2) / Math.max(100 - nextRect.height, 1),
      ) * Math.max(100 - nextRect.height, 0);
    }

    const nextFocus = focusFromOverlayRect(aspectRatio, nextRect);
    onFocusChange(nextFocus.cropFocusX, nextFocus.cropFocusY);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      rect: cropRect,
      axis:
        cropRect.width < 100 && cropRect.height < 100
          ? "both"
          : cropRect.width < 100
            ? "x"
            : "y",
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    updateFocusFromPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      ref={overlayRef}
      className={`format-preview-overlay${disabled ? " is-disabled" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="format-preview-mask format-preview-mask--top"
        style={{ height: `${cropRect.top}%` }}
      />
      <div
        className="format-preview-mask format-preview-mask--bottom"
        style={{
          top: `${cropRect.top + cropRect.height}%`,
          height: `${100 - cropRect.top - cropRect.height}%`,
        }}
      />
      <div
        className="format-preview-mask format-preview-mask--left"
        style={{
          top: `${cropRect.top}%`,
          height: `${cropRect.height}%`,
          width: `${cropRect.left}%`,
        }}
      />
      <div
        className="format-preview-mask format-preview-mask--right"
        style={{
          top: `${cropRect.top}%`,
          left: `${cropRect.left + cropRect.width}%`,
          height: `${cropRect.height}%`,
          width: `${100 - cropRect.left - cropRect.width}%`,
        }}
      />

      <div
        className="format-preview-frame"
        style={{
          left: `${cropRect.left}%`,
          top: `${cropRect.top}%`,
          width: `${cropRect.width}%`,
          height: `${cropRect.height}%`,
        }}
        onPointerDown={handlePointerDown}
        role="presentation"
      >
        <span className="format-preview-label">{summary}</span>
        {!disabled && <span className="format-preview-hint">Arraste para reposicionar</span>}
      </div>
    </div>
  );
}
