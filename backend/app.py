import logging
import os

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from downloader import (
    FFMPEG_AVAILABLE,
    YT_DLP_AVAILABLE,
    download_clip,
    download_video,
    list_formats,
)
from output_formats import normalize_output_height

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app, origins=os.environ.get("CORS_ORIGINS", "*").split(","))


@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "yt_dlp": YT_DLP_AVAILABLE,
            "ffmpeg": FFMPEG_AVAILABLE,
        }
    )


@app.get("/api/formats")
def get_video_formats():
    video_id = request.args.get("videoId")
    if not video_id:
        return jsonify({"error": "ID do vídeo não fornecido"}), 400

    if not YT_DLP_AVAILABLE:
        return jsonify({"error": "Serviço de download indisponível"}), 503

    return jsonify({"formats": list_formats(video_id)})


@app.get("/api/download")
def download_full_video():
    video_id = request.args.get("videoId")
    quality = request.args.get("quality", "best")

    if not video_id:
        return jsonify({"error": "ID do vídeo não fornecido"}), 400

    if not YT_DLP_AVAILABLE:
        return jsonify({"error": "Serviço de download indisponível"}), 503

    success, buffer, filename, error = download_video(video_id, quality)
    if not success or not buffer or not filename:
        return jsonify({"error": error or "Falha no download"}), 503

    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="video/mp4",
    )


@app.get("/api/clip")
def download_video_clip():
    video_id = request.args.get("videoId")
    quality = request.args.get("quality", "best")

    try:
        start = float(request.args.get("start", "0"))
        end = float(request.args.get("end", "0"))
    except ValueError:
        return jsonify({"error": "Intervalo inválido"}), 400

    if not video_id:
        return jsonify({"error": "ID do vídeo não fornecido"}), 400

    if end <= start:
        return jsonify({"error": "O fim do corte deve ser maior que o início"}), 400

    if not YT_DLP_AVAILABLE:
        return jsonify({"error": "Serviço de download indisponível"}), 503

    if not FFMPEG_AVAILABLE:
        return jsonify({"error": "FFmpeg não está instalado no servidor"}), 503

    aspect_ratio = request.args.get("aspectRatio", "original")
    output_height = request.args.get("outputHeight", "1080")

    try:
        crop_focus_x = float(request.args.get("cropFocusX", "0.5"))
        crop_focus_y = float(request.args.get("cropFocusY", "0.5"))
    except ValueError:
        return jsonify({"error": "Posição de recorte inválida"}), 400

    success, buffer, filename, error = download_clip(
        video_id,
        start,
        end,
        quality,
        aspect_ratio=aspect_ratio,
        output_height=normalize_output_height(output_height),
        crop_focus_x=crop_focus_x,
        crop_focus_y=crop_focus_y,
    )
    if not success or not buffer or not filename:
        return jsonify({"error": error or "Falha ao gerar corte"}), 503

    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype="video/mp4",
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
