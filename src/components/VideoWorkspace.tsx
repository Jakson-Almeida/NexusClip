import { useCallback, useEffect, useRef, useState } from "react";
import {
  downloadClip,
  fetchVideoDuration,
  fetchVideoFormats,
} from "../services/youtubeApi";
import type { VideoFormat, YouTubeSearchItem } from "../types/youtube";
import { formatSeconds, parseTimeInput } from "../utils/time";
import YouTubePlayer from "./YouTubePlayer";

interface VideoWorkspaceProps {
  video: YouTubeSearchItem;
  onBack: () => void;
}

export default function VideoWorkspace({ video, onBack }: VideoWorkspaceProps) {
  const videoId = video.id.videoId;
  const [duration, setDuration] = useState(0);
  const [startInput, setStartInput] = useState("0:00");
  const [endInput, setEndInput] = useState("0:30");
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(30);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [quality, setQuality] = useState("best");
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getCurrentTimeRef = useRef<(() => number) | null>(null);

  useEffect(() => {
    setError(null);
    setStartInput("0:00");
    setEndInput("0:30");
    setStartSeconds(0);
    setEndSeconds(30);

    fetchVideoDuration(videoId).then((seconds) => {
      setDuration(seconds);
      if (seconds > 0) {
        const defaultEnd = Math.min(30, seconds);
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
  }, [videoId]);

  const handlePlayerReady = useCallback((getCurrentTime: () => number) => {
    getCurrentTimeRef.current = getCurrentTime;
  }, []);

  const syncInterval = (nextStart: number, nextEnd: number) => {
    const boundedStart = Math.max(0, nextStart);
    const boundedEnd = duration > 0 ? Math.min(nextEnd, duration) : Math.max(nextEnd, boundedStart + 1);

    setStartSeconds(boundedStart);
    setEndSeconds(Math.max(boundedEnd, boundedStart + 1));
    setStartInput(formatSeconds(boundedStart));
    setEndInput(formatSeconds(Math.max(boundedEnd, boundedStart + 1)));
  };

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
    const getter = getCurrentTimeRef.current;
    if (!getter) {
      setError("Aguarde o player carregar.");
      return;
    }

    const current = Math.floor(getter());
    if (target === "start") {
      syncInterval(current, Math.max(endSeconds, current + 1));
    } else {
      syncInterval(startSeconds, Math.max(current, startSeconds + 1));
    }
    setError(null);
  };

  const handleDownload = async () => {
    if (endSeconds <= startSeconds) {
      setError("Selecione um intervalo válido.");
      return;
    }

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

      <YouTubePlayer videoId={videoId} onReady={handlePlayerReady} />

      <div className="clip-panel">
        <div className="clip-panel-header">
          <h3>Intervalo do corte</h3>
          {duration > 0 && (
            <span className="clip-duration-label">
              Duração do vídeo: {formatSeconds(duration)}
            </span>
          )}
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
              placeholder="0:30"
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
