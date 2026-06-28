export interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeVideoId {
  kind?: string;
  videoId: string;
}

export interface YouTubeSnippet {
  publishedAt?: string;
  channelId?: string;
  title: string;
  description?: string;
  channelTitle: string;
  thumbnails: {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
  };
}

export interface YouTubeSearchItem {
  kind?: string;
  etag?: string;
  id: YouTubeVideoId;
  snippet: YouTubeSnippet;
}

export interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export interface YouTubeVideoDetails {
  id: string;
  contentDetails?: {
    duration?: string;
  };
  snippet?: YouTubeSnippet;
}

export interface VideoFormat {
  format_id: string;
  quality: string;
  filesize_mb?: number | null;
}
