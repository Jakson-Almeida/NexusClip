import logging
import os
import re
import subprocess
import tempfile
from io import BytesIO

logger = logging.getLogger(__name__)

try:
    import yt_dlp
    from yt_dlp.utils import DownloadError, ExtractorError

    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False
    DownloadError = Exception  # type: ignore[misc, assignment]
    ExtractorError = Exception  # type: ignore[misc, assignment]

FFMPEG_AVAILABLE = False
try:
    result = subprocess.run(
        ["ffmpeg", "-version"],
        capture_output=True,
        timeout=2,
        check=False,
    )
    FFMPEG_AVAILABLE = result.returncode == 0
except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
    FFMPEG_AVAILABLE = False

TEMP_COOKIE_FILE_PATH: str | None = None


def get_cookies_file_path() -> str | None:
    global TEMP_COOKIE_FILE_PATH

    env_file_path = os.environ.get("YOUTUBE_COOKIES_FILE")
    if env_file_path and os.path.exists(env_file_path):
        return env_file_path

    if TEMP_COOKIE_FILE_PATH and os.path.exists(TEMP_COOKIE_FILE_PATH):
        return TEMP_COOKIE_FILE_PATH

    cookies_content = os.environ.get("YOUTUBE_COOKIES_CONTENT")
    if cookies_content:
        fd, path = tempfile.mkstemp(suffix=".txt", text=True)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(cookies_content)
        TEMP_COOKIE_FILE_PATH = path
        return path

    return None


def slugify(value: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", value).strip("_") or "video"
    return safe[:80]


def candidate_urls(video_id: str) -> list[str]:
    return [
        f"https://www.youtube.com/watch?v={video_id}",
        f"https://www.youtube.com/shorts/{video_id}",
        f"https://youtu.be/{video_id}",
    ]


def get_format_selector(quality: str | None = None) -> str:
    if quality in (None, "best"):
        if FFMPEG_AVAILABLE:
            return (
                "bestvideo[vcodec!*=av01][protocol!*=m3u8]+bestaudio[ext=m4a]/"
                "best[vcodec!*=av01][protocol!*=m3u8]/best"
            )
        return "best[ext=mp4][vcodec!*=av01][protocol!*=m3u8]/best[protocol!*=m3u8]/best"

    progressive = {"18", "22", "36", "37", "38", "43", "44", "45", "46"}
    if str(quality) in progressive:
        return f"{quality}/best[format_id={quality}]"
    if FFMPEG_AVAILABLE:
        return f"{quality}+bestaudio/{quality}/best"
    return f"{quality}/best"


def build_ydl_opts(
    *,
    format_selector: str | None = None,
    cookies_file: str | None = None,
    quiet: bool = True,
    extract_info_only: bool = False,
) -> dict:
    opts: dict = {
        "quiet": quiet,
        "no_warnings": quiet,
        "noplaylist": True,
        "extract_flat": False,
    }

    final_cookies = cookies_file or get_cookies_file_path()
    if final_cookies and os.path.exists(final_cookies):
        opts["cookiefile"] = final_cookies

    if not extract_info_only and format_selector:
        opts["format"] = format_selector
        if FFMPEG_AVAILABLE:
            opts["merge_output_format"] = "mp4"

    return opts


def extract_video_info(video_id: str) -> dict | None:
    if not YT_DLP_AVAILABLE:
        return None

    cookies_file = get_cookies_file_path()
    ydl_opts = build_ydl_opts(cookies_file=cookies_file, extract_info_only=True)

    for url in candidate_urls(video_id):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    return info
        except (DownloadError, ExtractorError, OSError) as exc:
            logger.warning("Falha ao obter info de %s: %s", url, exc)
            continue

    return None


def list_formats(video_id: str) -> list[dict]:
    info = extract_video_info(video_id)
    if not info:
        return [{"format_id": "best", "quality": "Melhor qualidade disponível"}]

    formats: list[dict] = []
    seen_labels: set[str] = set()

    for fmt in info.get("formats", []):
        format_id = fmt.get("format_id")
        height = fmt.get("height")
        vcodec = fmt.get("vcodec", "none")
        protocol = (fmt.get("protocol") or "").lower()

        if not format_id or vcodec == "none" or "av01" in vcodec.lower():
            continue
        if "m3u8" in protocol:
            continue

        if height:
            if height >= 1080:
                label = "Full HD (1080p)"
            elif height >= 720:
                label = "HD (720p)"
            elif height >= 480:
                label = "SD (480p)"
            else:
                label = f"{height}p"
        else:
            label = f"Formato {format_id}"

        if label in seen_labels:
            continue
        seen_labels.add(label)

        filesize = fmt.get("filesize") or fmt.get("filesize_approx")
        formats.append(
            {
                "format_id": format_id,
                "quality": label,
                "filesize_mb": round(filesize / (1024 * 1024), 2) if filesize else None,
            }
        )

    formats.sort(key=lambda item: item.get("filesize_mb") or 0, reverse=True)
    if not formats:
        return [{"format_id": "best", "quality": "Melhor qualidade disponível"}]

    return [{"format_id": "best", "quality": "Melhor qualidade disponível"}, *formats[:6]]


def download_video(video_id: str, quality: str = "best") -> tuple[bool, BytesIO | None, str | None, str | None]:
    if not YT_DLP_AVAILABLE:
        return False, None, None, "yt-dlp não está instalado"

    cookies_file = get_cookies_file_path()
    format_selector = get_format_selector(quality)
    format_attempts = [
        format_selector,
        "bestvideo[vcodec!*=av01]+bestaudio/best",
        "best[ext=mp4]/best",
    ]

    for url in candidate_urls(video_id):
        for attempt_format in format_attempts:
            try:
                with tempfile.TemporaryDirectory() as tmpdir:
                    ydl_opts = build_ydl_opts(
                        format_selector=attempt_format,
                        cookies_file=cookies_file,
                        quiet=False,
                    )
                    ydl_opts["outtmpl"] = os.path.join(tmpdir, "%(title)s.%(ext)s")

                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        ydl.download([url])

                    files = [
                        os.path.join(tmpdir, name)
                        for name in os.listdir(tmpdir)
                        if os.path.isfile(os.path.join(tmpdir, name))
                        and name.endswith((".mp4", ".mkv", ".webm"))
                        and not re.search(r"\.f\d+\.", name)
                    ]

                    if not files:
                        continue

                    source_path = max(files, key=os.path.getsize)
                    title = info.get("title", "video") if info else "video"
                    filename = f"{slugify(title)}.mp4"

                    with open(source_path, "rb") as handle:
                        buffer = BytesIO(handle.read())

                    buffer.seek(0)
                    return True, buffer, filename, None
            except (DownloadError, ExtractorError, OSError) as exc:
                logger.warning(
                    "Download falhou para %s com formato %s: %s",
                    url,
                    attempt_format,
                    exc,
                )
                continue

    return False, None, None, "Não foi possível baixar o vídeo. Verifique cookies ou tente novamente."


def trim_clip(source_path: str, output_path: str, start: float, end: float) -> tuple[bool, str | None]:
    if not FFMPEG_AVAILABLE:
        return False, "FFmpeg não está instalado"

    if end <= start:
        return False, "O fim do corte deve ser maior que o início"

    duration = end - start
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start),
        "-i",
        source_path,
        "-t",
        str(duration),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        output_path,
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=600, check=True)
        return True, None
    except subprocess.CalledProcessError as exc:
        logger.error("Erro ao recortar vídeo: %s", exc.stderr)
        return False, "Não foi possível recortar o vídeo"
    except subprocess.TimeoutExpired:
        return False, "Tempo esgotado ao recortar o vídeo"


def download_clip(
    video_id: str,
    start: float,
    end: float,
    quality: str = "best",
) -> tuple[bool, BytesIO | None, str | None, str | None]:
    success, buffer, filename, error = download_video(video_id, quality)
    if not success or not buffer or not filename:
        return False, None, None, error

    with tempfile.TemporaryDirectory() as tmpdir:
        source_path = os.path.join(tmpdir, "source.mp4")
        clip_path = os.path.join(tmpdir, "clip.mp4")

        with open(source_path, "wb") as handle:
            handle.write(buffer.getvalue())

        ok, trim_error = trim_clip(source_path, clip_path, start, end)
        if not ok:
            return False, None, None, trim_error

        base_name = os.path.splitext(filename)[0]
        clip_filename = f"{base_name}_clip_{int(start)}_{int(end)}.mp4"

        with open(clip_path, "rb") as handle:
            clip_buffer = BytesIO(handle.read())

        clip_buffer.seek(0)
        return True, clip_buffer, clip_filename, None
