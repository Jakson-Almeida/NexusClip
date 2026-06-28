import { getYouTubeApiKey } from "../config";
import type {
  YouTubeSearchItem,
  YouTubeSearchResponse,
  YouTubeVideoDetails,
} from "../types/youtube";
import { extractYouTubeVideoId } from "../utils/youtube";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

function requireApiKey(): string {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new Error("Configure REACT_APP_YOUTUBE_API_KEY no arquivo .env");
  }
  return apiKey;
}

export async function searchVideos(query: string): Promise<YouTubeSearchItem[]> {
  const apiKey = requireApiKey();
  const videoId = extractYouTubeVideoId(query);

  if (videoId) {
    const item = await fetchVideoById(videoId);
    return item ? [item] : [];
  }

  const response = await fetch(
    `${SEARCH_URL}?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar vídeos. Tente novamente.");
  }

  const data = (await response.json()) as YouTubeSearchResponse;
  return data.items ?? [];
}

async function fetchVideoById(videoId: string): Promise<YouTubeSearchItem | null> {
  const apiKey = requireApiKey();
  const response = await fetch(
    `${VIDEOS_URL}?part=snippet&id=${videoId}&key=${apiKey}`,
  );

  if (!response.ok) {
    throw new Error("Erro ao carregar vídeo.");
  }

  const data = (await response.json()) as { items?: YouTubeVideoDetails[] };
  const item = data.items?.[0];
  if (!item?.snippet) return null;

  return {
    id: { videoId: item.id },
    snippet: item.snippet,
  };
}

export async function fetchVideoDuration(videoId: string): Promise<number> {
  const apiKey = requireApiKey();
  const response = await fetch(
    `${VIDEOS_URL}?part=contentDetails&id=${videoId}&key=${apiKey}`,
  );

  if (!response.ok) {
    return 0;
  }

  const data = (await response.json()) as { items?: YouTubeVideoDetails[] };
  const duration = data.items?.[0]?.contentDetails?.duration;
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchVideoFormats(videoId: string) {
  const response = await fetch(`/api/formats?videoId=${videoId}`);
  if (!response.ok) {
    return [{ format_id: "best", quality: "Melhor qualidade disponível" }];
  }

  const data = (await response.json()) as { formats?: { format_id: string; quality: string; filesize_mb?: number }[] };
  return data.formats ?? [{ format_id: "best", quality: "Melhor qualidade disponível" }];
}

export async function downloadClip(params: {
  videoId: string;
  start: number;
  end: number;
  quality: string;
}) {
  const query = new URLSearchParams({
    videoId: params.videoId,
    start: String(params.start),
    end: String(params.end),
    quality: params.quality,
  });

  const response = await fetch(`/api/clip?${query.toString()}`);
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Não foi possível baixar o corte.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = `clip_${params.videoId}.mp4`;

  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  return { blob, filename };
}
