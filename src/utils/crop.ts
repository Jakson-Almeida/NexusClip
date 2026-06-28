import type { ClipAspectRatio } from "../types/clip";
import { getPreset } from "../constants/outputFormats";

export interface CropOverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PLAYER_ASPECT_RATIO = 16 / 9;

export function getCropOverlayRect(
  aspectRatio: ClipAspectRatio,
  focusX: number,
  focusY: number,
): CropOverlayRect | null {
  if (aspectRatio === "original") return null;

  const preset = getPreset(aspectRatio);
  const targetRatio = preset.ratioWidth / preset.ratioHeight;
  const clampedFocusX = clamp01(focusX);
  const clampedFocusY = clamp01(focusY);

  if (targetRatio < PLAYER_ASPECT_RATIO) {
    const width = (targetRatio / PLAYER_ASPECT_RATIO) * 100;
    const left = (100 - width) * clampedFocusX;
    return { left, top: 0, width, height: 100 };
  }

  if (targetRatio > PLAYER_ASPECT_RATIO) {
    const height = (PLAYER_ASPECT_RATIO / targetRatio) * 100;
    const top = (100 - height) * clampedFocusY;
    return { left: 0, top, width: 100, height };
  }

  return { left: 0, top: 0, width: 100, height: 100 };
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function focusFromOverlayRect(
  aspectRatio: ClipAspectRatio,
  rect: CropOverlayRect,
): { cropFocusX: number; cropFocusY: number } {
  if (aspectRatio === "original") {
    return { cropFocusX: 0.5, cropFocusY: 0.5 };
  }

  const preset = getPreset(aspectRatio);
  const targetRatio = preset.ratioWidth / preset.ratioHeight;

  if (targetRatio < PLAYER_ASPECT_RATIO) {
    const maxOffset = 100 - rect.width;
    return {
      cropFocusX: maxOffset > 0 ? clamp01(rect.left / maxOffset) : 0.5,
      cropFocusY: 0.5,
    };
  }

  if (targetRatio > PLAYER_ASPECT_RATIO) {
    const maxOffset = 100 - rect.height;
    return {
      cropFocusX: 0.5,
      cropFocusY: maxOffset > 0 ? clamp01(rect.top / maxOffset) : 0.5,
    };
  }

  return { cropFocusX: 0.5, cropFocusY: 0.5 };
}
