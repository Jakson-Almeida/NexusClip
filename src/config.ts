export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function getYouTubeApiKey(): string {
  return (
    import.meta.env.REACT_APP_YOUTUBE_API_KEY ||
    import.meta.env.VITE_YOUTUBE_API_KEY ||
    ""
  );
}
