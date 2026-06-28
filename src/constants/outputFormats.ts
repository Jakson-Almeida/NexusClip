import type { ClipAspectRatio, ClipOutputHeight } from "../types/clip";

export interface OutputFormatPreset {
  id: ClipAspectRatio;
  label: string;
  shortLabel: string;
  ratioWidth: number;
  ratioHeight: number;
}

export const OUTPUT_FORMAT_PRESETS: OutputFormatPreset[] = [
  { id: "original", label: "Original", shortLabel: "Orig.", ratioWidth: 0, ratioHeight: 0 },
  { id: "16:9", label: "16:9 Paisagem", shortLabel: "16:9", ratioWidth: 16, ratioHeight: 9 },
  { id: "9:16", label: "9:16 Vertical", shortLabel: "9:16", ratioWidth: 9, ratioHeight: 16 },
  { id: "1:1", label: "1:1 Quadrado", shortLabel: "1:1", ratioWidth: 1, ratioHeight: 1 },
  { id: "4:5", label: "4:5 Instagram", shortLabel: "4:5", ratioWidth: 4, ratioHeight: 5 },
];

export const OUTPUT_HEIGHT_OPTIONS: { value: ClipOutputHeight; label: string }[] = [
  { value: 1080, label: "1080p" },
  { value: 720, label: "720p" },
  { value: 480, label: "480p" },
];

export function getPreset(aspectRatio: ClipAspectRatio): OutputFormatPreset {
  return OUTPUT_FORMAT_PRESETS.find((preset) => preset.id === aspectRatio) ?? OUTPUT_FORMAT_PRESETS[0];
}

export function getOutputDimensions(
  aspectRatio: ClipAspectRatio,
  outputHeight: ClipOutputHeight,
): { width: number; height: number } | null {
  if (aspectRatio === "original") return null;

  const preset = getPreset(aspectRatio);
  const shortEdge = outputHeight - (outputHeight % 2);
  let width: number;
  let height: number;

  if (preset.ratioWidth >= preset.ratioHeight) {
    height = shortEdge;
    width = Math.round(height * (preset.ratioWidth / preset.ratioHeight));
  } else {
    width = shortEdge;
    height = Math.round(width * (preset.ratioHeight / preset.ratioWidth));
  }

  width -= width % 2;
  height -= height % 2;

  return { width, height };
}

export function formatOutputSummary(
  aspectRatio: ClipAspectRatio,
  outputHeight: ClipOutputHeight,
): string {
  if (aspectRatio === "original") return "Original";

  const dims = getOutputDimensions(aspectRatio, outputHeight);
  if (!dims) return getPreset(aspectRatio).shortLabel;

  return `${getPreset(aspectRatio).shortLabel} · ${dims.width}×${dims.height}`;
}
