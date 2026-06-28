export type ClipAspectRatio = "original" | "16:9" | "9:16" | "1:1" | "4:5";

export type ClipOutputHeight = 1080 | 720 | 480;

export interface VideoClip {
  id: string;
  start: number;
  end: number;
  aspectRatio: ClipAspectRatio;
  outputHeight: ClipOutputHeight;
  quality: string;
  cropFocusX: number;
  cropFocusY: number;
}
