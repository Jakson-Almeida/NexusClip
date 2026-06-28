import type { YouTubeSearchItem } from "../types/youtube";

interface VideoResultsProps {
  videos: YouTubeSearchItem[];
  selectedVideoId?: string;
  onSelect: (video: YouTubeSearchItem) => void;
}

export default function VideoResults({
  videos,
  selectedVideoId,
  onSelect,
}: VideoResultsProps) {
  if (videos.length === 0) {
    return (
      <p className="empty-state">Nenhum vídeo encontrado para esta busca.</p>
    );
  }

  return (
    <div className="video-results">
      {videos.map((video) => {
        const videoId = video.id.videoId;
        const thumbnail =
          video.snippet.thumbnails.medium?.url ||
          video.snippet.thumbnails.default?.url;

        return (
          <button
            key={videoId}
            type="button"
            className={`video-card${selectedVideoId === videoId ? " is-selected" : ""}`}
            onClick={() => onSelect(video)}
          >
            {thumbnail && (
              <img
                src={thumbnail}
                alt=""
                className="video-card-thumb"
                loading="lazy"
              />
            )}
            <span className="video-card-body">
              <span className="video-card-title">{video.snippet.title}</span>
              <span className="video-card-channel">{video.snippet.channelTitle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
