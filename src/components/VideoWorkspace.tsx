import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  downloadClip,
  fetchVideoDuration,
  fetchVideoFormats,
} from "../services/youtubeApi";
import type { VideoClip } from "../types/clip";
import type { VideoFormat, YouTubeSearchItem } from "../types/youtube";
import { createClip, createDefaultClips, normalizeClipInterval } from "../utils/clips";
import { formatSeconds, parseTimeInput } from "../utils/time";
import ClipList from "./ClipList";
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
  const [clips, setClips] = useState<VideoClip[]>(() => createDefaultClips());
  const [activeClipId, setActiveClipId] = useState<string>(() => clips[0]?.id ?? "");
  const [startInput, setStartInput] = useState("0:00");
  const [endInput, setEndInput] = useState("0:15");
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

  const activeClip = useMemo(
    () => clips.find((clip) => clip.id === activeClipId) ?? clips[0],
    [clips, activeClipId],
  );

  const startSeconds = activeClip?.start ?? 0;
  const endSeconds = activeClip?.end ?? DEFAULT_CLIP_SECONDS;

  const stopPreviewMonitor = useCallback(() => {
    if (previewMonitorRef.current !== null) {
      window.clearInterval(previewMonitorRef.current);
      previewMonitorRef.current = null;
    }
    setPreviewing(false);
  }, []);

  const updateClipInterval = useCallback(
    (clipId: string, nextStart: number, nextEnd: number) => {
      const normalized = normalizeClipInterval(nextStart, nextEnd, duration);
      setClips((prev) =>
        prev.map((clip) =>
          clip.id === clipId ? { ...clip, ...normalized } : clip,
        ),
      );
      if (clipId === activeClipId) {
        setStartInput(formatSeconds(normalized.start));
        setEndInput(formatSeconds(normalized.end));
      }
    },
    [duration, activeClipId],
  );

  useEffect(() => {
    stopPreviewMonitor();
    setError(null);
    setPlayerReady(false);
    setCurrentTime(0);

    const initialClips = createDefaultClips();
    setClips(initialClips);
    setActiveClipId(initialClips[0].id);
    setStartInput(formatSeconds(initialClips[0].start));
    setEndInput(formatSeconds(initialClips[0].end));

    fetchVideoDuration(videoId).then((seconds) => {
      setDuration(seconds);
      if (seconds <= 0) return;

      setClips((prev) => {
        const normalized = prev.map((clip) => {
          const next = normalizeClipInterval(clip.start, clip.end, seconds);
          return { ...clip, ...next };
        });

        setActiveClipId((currentId) => {
          const active = normalized.find((clip) => clip.id === currentId) ?? normalized[0];
          if (active) {
            setStartInput(formatSeconds(active.start));
            setEndInput(formatSeconds(active.end));
            return active.id;
          }
          return currentId;
        });

        return normalized;
      });
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

  useEffect(() => {
    if (!activeClip) return;
    setStartInput(formatSeconds(activeClip.start));
    setEndInput(formatSeconds(activeClip.end));
    stopPreviewMonitor();
  }, [activeClipId, activeClip, stopPreviewMonitor]);

  const handlePlayerReady = useCallback((player: YouTubePlayerHandle) => {
    playerRef.current = player;
    setPlayerReady(true);

    const playerDuration = Math.floor(player.getDuration());
    if (playerDuration > 0) {
      setDuration(playerDuration);
      setClips((prev) =>
        prev.map((clip) => {
          const next = normalizeClipInterval(clip.start, clip.end, playerDuration);
          return { ...clip, ...next };
        }),
      );
    }
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const selectClip = (clipId: string) => {
    stopPreviewMonitor();
    setActiveClipId(clipId);
    setError(null);
  };

  const addClip = () => {
    stopPreviewMonitor();
    setError(null);

    const baseStart = Math.floor(currentTime);
    const baseEnd = baseStart + DEFAULT_CLIP_SECONDS;
    const newClip = createClip(baseStart, baseEnd, duration);

    setClips((prev) => [...prev, newClip]);
    setActiveClipId(newClip.id);
  };

  const removeClip = (clipId: string) => {
    if (clips.length <= 1) return;

    stopPreviewMonitor();
    setError(null);

    setClips((prev) => {
      const next = prev.filter((clip) => clip.id !== clipId);
      if (activeClipId === clipId) {
        setActiveClipId(next[0]?.id ?? "");
      }
      return next;
    });
  };

  const applyManualTimes = () => {
    if (!activeClip) return;

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
    updateClipInterval(activeClip.id, parsedStart, parsedEnd);
  };

  const markCurrentTime = (target: "start" | "end") => {
    if (!activeClip) return;

    const player = playerRef.current;
    if (!player) {
      setError("Aguarde o player carregar.");
      return;
    }

    const current = Math.floor(player.getCurrentTime());
    if (target === "start") {
      updateClipInterval(activeClip.id, current, Math.max(endSeconds, current + 1));
    } else {
      updateClipInterval(activeClip.id, startSeconds, Math.max(current, startSeconds + 1));
    }
    setError(null);
  };

  const handleTimelineChange = (nextStart: number, nextEnd: number) => {
    if (!activeClip) return;
    stopPreviewMonitor();
    updateClipInterval(activeClip.id, nextStart, nextEnd);
    setError(null);
  };

  const handleTimelineSeek = (time: number) => {
    playerRef.current?.seekTo(time);
    setCurrentTime(time);
  };

  const playClipPreview = () => {
    const player = playerRef.current;
    if (!player || !activeClip) {
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
    if (!activeClip) return;

    stopPreviewMonitor();
    playerRef.current?.pauseVideo();

    const defaultEnd =
      duration > 0 ? Math.min(DEFAULT_CLIP_SECONDS, duration) : DEFAULT_CLIP_SECONDS;
    updateClipInterval(activeClip.id, 0, defaultEnd);

    playerRef.current?.seekTo(0);
    setCurrentTime(0);
    setError(null);
  };

  const handleDownload = async () => {
    if (!activeClip || endSeconds <= startSeconds) {
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
  const activeClipIndex = clips.findIndex((clip) => clip.id === activeClipId);
  const hasDefaultSelection =
    startSeconds === 0 &&
    endSeconds === (duration > 0 ? Math.min(DEFAULT_CLIP_SECONDS, duration) : DEFAULT_CLIP_SECONDS);

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
        <ClipList
          clips={clips}
          activeClipId={activeClipId}
          onSelect={selectClip}
          onAdd={addClip}
          onRemove={removeClip}
        />

        <div className="clip-panel-header">
          <h3>
            {activeClipIndex >= 0 ? `Editando corte ${activeClipIndex + 1}` : "Intervalo do corte"}
          </h3>
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
          backgroundClips={clips}
          activeClipId={activeClipId}
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
            disabled={!playerReady || hasDefaultSelection}
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
          Corte ativo: {formatSeconds(startSeconds)} → {formatSeconds(endSeconds)} (
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
          {downloading ? "Gerando corte..." : "Baixar corte ativo"}
        </button>
      </div>
    </section>
  );
}
