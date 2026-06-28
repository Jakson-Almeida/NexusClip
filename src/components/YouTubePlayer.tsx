import { useEffect, useRef, useState } from "react";

export interface YouTubePlayerHandle {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

export const YT_STATE_PLAYING = 1;

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayerHandle & { destroy: () => void };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const existing = document.getElementById("youtube-iframe-api");
      if (existing) {
        window.onYouTubeIframeAPIReady = () => resolve();
        return;
      }

      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => resolve();
      document.body.appendChild(script);
    });
  }

  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: YouTubePlayerHandle) => void;
  onTimeUpdate?: (time: number) => void;
}

export default function YouTubePlayer({
  videoId,
  onReady,
  onTimeUpdate,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<(YouTubePlayerHandle & { destroy: () => void }) | null>(null);
  const onReadyRef = useRef(onReady);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const [ready, setReady] = useState(false);

  onReadyRef.current = onReady;
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT) return;

      playerRef.current?.destroy();
      containerRef.current.innerHTML = "";

      const player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            onReadyRef.current?.(player);
          },
          onStateChange: (event) => {
            if (event.data === YT_STATE_PLAYING) {
              onTimeUpdateRef.current?.(player.getCurrentTime());
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setReady(false);
    };
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || player.getPlayerState() !== YT_STATE_PLAYING) return;
      onTimeUpdateRef.current?.(player.getCurrentTime());
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [ready]);

  return (
    <div className="youtube-player">
      <div ref={containerRef} className="youtube-player-frame" />
      {!ready && <p className="player-loading">Carregando player...</p>}
    </div>
  );
}
