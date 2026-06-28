import type { VideoClip } from "../types/clip";
import { formatSeconds } from "../utils/time";

interface ClipListProps {
  clips: VideoClip[];
  activeClipId: string;
  onSelect: (clipId: string) => void;
  onAdd: () => void;
  onRemove: (clipId: string) => void;
}

export default function ClipList({
  clips,
  activeClipId,
  onSelect,
  onAdd,
  onRemove,
}: ClipListProps) {
  return (
    <div className="clip-list">
      <div className="clip-list-header">
        <h4>Cortes deste vídeo</h4>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAdd}>
          + Novo corte
        </button>
      </div>

      <div className="clip-list-items">
        {clips.map((clip, index) => {
          const isActive = clip.id === activeClipId;
          const clipDuration = Math.max(0, clip.end - clip.start);

          return (
            <div
              key={clip.id}
              className={`clip-list-item${isActive ? " is-active" : ""}`}
            >
              <button
                type="button"
                className="clip-list-select"
                onClick={() => onSelect(clip.id)}
              >
                <span className="clip-list-name">Corte {index + 1}</span>
                <span className="clip-list-range">
                  {formatSeconds(clip.start)} → {formatSeconds(clip.end)} (
                  {formatSeconds(clipDuration)})
                </span>
              </button>
              {clips.length > 1 && (
                <button
                  type="button"
                  className="clip-list-remove"
                  onClick={() => onRemove(clip.id)}
                  aria-label={`Remover corte ${index + 1}`}
                  title="Remover corte"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
