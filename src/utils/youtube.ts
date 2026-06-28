const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(YOUTUBE_ID_PATTERN);
  return match?.[1] ?? null;
}
