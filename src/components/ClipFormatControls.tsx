import type { ClipAspectRatio, ClipOutputHeight } from "../types/clip";
import type { VideoFormat } from "../types/youtube";
import {
  formatOutputSummary,
  getOutputDimensions,
  OUTPUT_FORMAT_PRESETS,
  OUTPUT_HEIGHT_OPTIONS,
} from "../constants/outputFormats";

interface ClipFormatControlsProps {
  aspectRatio: ClipAspectRatio;
  outputHeight: ClipOutputHeight;
  quality: string;
  formats: VideoFormat[];
  loadingFormats?: boolean;
  onAspectRatioChange: (aspectRatio: ClipAspectRatio) => void;
  onOutputHeightChange: (outputHeight: ClipOutputHeight) => void;
  onQualityChange: (quality: string) => void;
}

export default function ClipFormatControls({
  aspectRatio,
  outputHeight,
  quality,
  formats,
  loadingFormats = false,
  onAspectRatioChange,
  onOutputHeightChange,
  onQualityChange,
}: ClipFormatControlsProps) {
  const outputDimensions = getOutputDimensions(aspectRatio, outputHeight);
  const summary = formatOutputSummary(aspectRatio, outputHeight);

  return (
    <div className="clip-format-controls">
      <div className="clip-format-header">
        <h4>Formato de saída</h4>
        <span className="clip-format-summary">{summary}</span>
      </div>

      <div className="format-preset-grid">
        {OUTPUT_FORMAT_PRESETS.map((preset) => {
          const isActive = preset.id === aspectRatio;
          const ratioStyle =
            preset.id === "original"
              ? undefined
              : {
                  aspectRatio: `${preset.ratioWidth} / ${preset.ratioHeight}`,
                };

          return (
            <button
              key={preset.id}
              type="button"
              className={`format-preset${isActive ? " is-active" : ""}`}
              onClick={() => onAspectRatioChange(preset.id)}
              title={preset.label}
            >
              <span
                className={`format-preset-preview${preset.id === "original" ? " format-preset-preview--original" : ""}`}
                style={ratioStyle}
              />
              <span className="format-preset-label">{preset.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="clip-format-fields">
        {aspectRatio !== "original" && (
          <label className="field">
            <span>Resolução</span>
            <select
              value={outputHeight}
              onChange={(event) =>
                onOutputHeightChange(Number(event.target.value) as ClipOutputHeight)
              }
            >
              {OUTPUT_HEIGHT_OPTIONS.map((option) => {
                const dims = getOutputDimensions(aspectRatio, option.value);
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {dims ? ` (${dims.width}×${dims.height})` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        {!loadingFormats && formats.length > 0 && (
          <label className="field quality-field">
            <span>Qualidade de origem</span>
            <select value={quality} onChange={(event) => onQualityChange(event.target.value)}>
              {formats.map((format) => (
                <option key={format.format_id} value={format.format_id}>
                  {format.quality}
                  {format.filesize_mb ? ` (~${format.filesize_mb} MB)` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {outputDimensions && (
        <p className="clip-format-note">
          O vídeo será recortado e exportado em {outputDimensions.width}×{outputDimensions.height}.
          Ajuste a área no player acima.
        </p>
      )}
    </div>
  );
}
