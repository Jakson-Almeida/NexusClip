import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadClip,
  fetchVideoDuration,
  fetchVideoFormats,
} from "../services/youtubeApi";
import type { VideoFormat, YouTubeSearchItem } from "../types/youtube";
import { formatSeconds, parseTimeInput } from "../utils/time";
import ClipTimeline from "./ClipTimeline";
import YouTubePlayer, { type YouTubePlayerHandle } from "./YouTubePlayer";

interface VideoWorkspaceProps {
  video: YouTubeSearchItem;
  onBack: () => void;
}

const DEFAULT_CLIP_SECONDS = 15;

export default function VideoWorkspace({ video, onBack }: VideoWorkspaceProps) {
  const videoId = video.id.videoId;
  const [duration, setDuration] = useState(0);
  const [startInput, setStartInput] = useState("0:00");
  const [endInput, setEndInput] = useState("0:15");
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(DEFAULT_CLIP_SECONDS);
  const [currentTime, setCurrentTime] = useState(0);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [quality, setQuality] = useState("best");
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const previewMonitorRef = useRef<number | null>(null);

  const stopPreviewMonitor = useCallback(() => {
    if (previewMonitorRef.current !== null) {
      window.clearInterval(previewMonitorRef.current);
      previewMonitorRef.current = null;
    }
    setPreviewing(false);
  }, []);

  useEffect(() => {
    stopPreviewMonitor();
    setError(null);
    setPlayerReady(false);
    setCurrentTime(0);
    setStartInput("0:00");
    setEndInput(formatSeconds(DEFAULT_CLIP_SECONDS));
    setStartSeconds(0);
    setEndSeconds(DEFAULT_CLIP_SECONDS);

    fetchVideoDuration(videoId).then((seconds) => {
      setDuration(seconds);
      if (seconds > 0) {
        const defaultEnd = Math.min(DEFAULT_CLIP_SECONDS, seconds);
        setEndSeconds(defaultEnd);
        setEndInput(formatSeconds(defaultEnd));
      }
    });

    setLoadingFormats(true);
    fetchVideoFormats(videoId)
      .then((items) => {
        setFormats(items);
        setQuality(items[0]?.format_id || "best");
      })
      .finally(() => setLoadingFormats(false));

    return () => stopPreviewMonitor();
  }, [videoId, stopPreviewMonitor]);

  const syncInterval = useCallback(
    (nextStart: number, nextEnd: number) => {
      const boundedStart = Math.max(0, nextStart);
      const boundedEnd =
        duration > 0
          ? Math.min(nextEnd, duration)
          : Math.max(nextEnd, boundedStart + 1);

      const safeEnd = Math.max(boundedEnd, boundedStart + 1);

      setStartSeconds(boundedStart);
      setEndSeconds(safeEnd);
      setStartInput(formatSeconds(boundedStart));
      setEndInput(formatSeconds(safeEnd));
    },
    [duration],
  );

  const handlePlayerReady = useCallback((player: YouTubePlayerHandle) => {
    playerRef.current = player;
    setPlayerReady(true);

    const playerDuration = Math.floor(player.getDuration());
    if (playerDuration > 0) {
      setDuration(playerDuration);
      setEndSeconds((currentEnd) => {
        const nextEnd = Math.min(currentEnd, playerDuration);
        setEndInput(formatSeconds(nextEnd));
        return nextEnd;
      });
    }
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const applyManualTimes = () => {
    const parsedStart = parseTimeInput(startInput);
    const parsedEnd = parseTimeInput(endInput);

    if (parsedStart === null || parsedEnd === null) {
      setError("Use o formato mm:ss ou segundos.");
      return;
    }

    if (parsedEnd <= parsedStart) {
      setError("O fim do corte deve ser maior que o início.");
      return;
    }

    setError(null);
    syncInterval(parsedStart, parsedEnd);
  };

  const markCurrentTime = (target: "start" | "end") => {
    const player = playerRef.current;
    if (!player) {
      setError("Aguarde o player carregar.");
      return;
    }

    const current = Math.floor(player.getCurrentTime());
    if (target === "start") {
      syncInterval(current, Math.max(endSeconds, current + 1));
    } else {
      syncInterval(startSeconds, Math.max(current, startSeconds + 1));
    }
    setError(null);
  };

  const handleTimelineChange = (nextStart: number, nextEnd: number) => {
    stopPreviewMonitor();
    syncInterval(nextStart, nextEnd);
    setError(null);
  };

  const handleTimelineSeek = (time: number) => {
    playerRef.current?.seekTo(time);
    setCurrentTime(time);
  };

  const playClipPreview = () => {
    const player = playerRef.current;
    if (!player) {
      setError("Aguarde o player carregar.");
      return;
    }

    if (endSeconds <= startSeconds) {
      setError("Selecione um intervalo válido.");
      return;
    }

    stopPreviewMonitor();
    setError(null);
    setPreviewing(true);
    player.seekTo(startSeconds);
    player.playVideo();
    setCurrentTime(startSeconds);

    previewMonitorRef.current = window.setInterval(() => {
      const activePlayer = playerRef.current;
      if (!activePlayer) return;

      const time = activePlayer.getCurrentTime();
      setCurrentTime(time);

      if (time >= endSeconds - 0.25) {
        activePlayer.pauseVideo();
        activePlayer.seekTo(startSeconds);
        setCurrentTime(startSeconds);
        stopPreviewMonitor();
      }
    }, 150);
  };

  const clearClipSelection = () => {
    stopPreviewMonitor();
    playerRef.current?.pauseVideo();

    if (duration > 0) {
      syncInterval(0, duration);
    } else {
      syncInterval(0, DEFAULT_CLIP_SECONDS);
    }

    playerRef.current?.seekTo(0);
    setCurrentTime(0);
    setError(null);
  };

  const handleDownload = async () => {
    if (endSeconds <= startSeconds) {
      setError("Selecione um intervalo válido.");
      return;
    }

    stopPreviewMonitor();
    setDownloading(true);
    setError(null);

    try {
      const { blob, filename } = await downloadClip({
        videoId,
        start: startSeconds,
        end: endSeconds,
        quality,
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar corte.");
    } finally {
      setDownloading(false);
    }
  };

  const clipDuration = Math.max(0, endSeconds - startSeconds);
  const hasFullSelection = duration > 0 && startSeconds === 0 && endSeconds === duration;

  return (
    <section className="video-workspace">
      <button type="button" className="back-button" onClick={onBack}>
        ← Voltar aos resultados
      </button>

      <div className="workspace-header">
        <div>
          <h2 className="workspace-title">{video.snippet.title}</h2>
          <p className="workspace-meta">{video.snippet.channelTitle}</p>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="external-link"
        >
          Abrir no YouTube
        </a>
      </div>

      <YouTubePlayer
        videoId={videoId}
        onReady={handlePlayerReady}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="clip-panel">
        <div className="clip-panel-header">
          <h3>Intervalo do corte</h3>
          {duration > 0 && (
            <span className="clip-duration-label">
              Duração do vídeo: {formatSeconds(duration)}
            </span>
          )}
        </div>

        <ClipTimeline
          duration={duration}
          start={startSeconds}
          end={endSeconds}
          currentTime={currentTime}
          disabled={!playerReady || duration <= 0}
          onChange={handleTimelineChange}
          onSeek={handleTimelineSeek}
        />

        <div className="clip-preview-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={playClipPreview}
            disabled={!playerReady || endSeconds <= startSeconds}
          >
            {previewing ? "Reproduzindo corte..." : "Reproduzir corte"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearClipSelection}
            disabled={!playerReady || hasFullSelection}
          >
            Limpar seleção
          </button>
        </div>

        <div className="clip-markers">
          <button type="button" className="btn btn-secondary" onClick={() => markCurrentTime("start")}>
            Marcar início
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => markCurrentTime("end")}>
            Marcar fim
          </button>
        </div>

        <div className="clip-inputs">
          <label className="field">
            <span>Início</span>
            <input
              type="text"
              value={startInput}
              onChange={(event) => setStartInput(event.target.value)}
              placeholder="0:00"
            />
          </label>
          <label className="field">
            <span>Fim</span>
            <input
              type="text"
              value={endInput}
              onChange={(event) => setEndInput(event.target.value)}
              placeholder="0:15"
            />
          </label>
          <button type="button" className="btn btn-secondary" onClick={applyManualTimes}>
            Aplicar
          </button>
        </div>

        <p className="clip-summary">
          Corte selecionado: {formatSeconds(startSeconds)} → {formatSeconds(endSeconds)} (
          {formatSeconds(clipDuration)})
        </p>

        {!loadingFormats && formats.length > 0 && (
          <label className="field quality-field">
            <span>Qualidade</span>
            <select value={quality} onChange={(event) => setQuality(event.target.value)}>
              {formats.map((format) => (
                <option key={format.format_id} value={format.format_id}>
                  {format.quality}
                  {format.filesize_mb ? ` (~${format.filesize_mb} MB)` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDownload}
          disabled={downloading || loadingFormats}
        >
          {downloading ? "Gerando corte..." : "Baixar corte"}
        </button>
      </div>
    </section>
  );
}
