import { useEffect, useRef, useState } from "react";

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (getCurrentTime: () => number) => void;
}

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
          };
        },
      ) => {
        getCurrentTime: () => number;
        destroy: () => void;
      };
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

export default function YouTubePlayer({ videoId, onReady }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ getCurrentTime: () => number; destroy: () => void } | null>(null);
  const onReadyRef = useRef(onReady);
  const [ready, setReady] = useState(false);

  onReadyRef.current = onReady;

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
            onReadyRef.current?.(() => player.getCurrentTime());
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="youtube-player">
      <div ref={containerRef} className="youtube-player-frame" />
      {!ready && <p className="player-loading">Carregando player...</p>}
    </div>
  );
}
