ASPECT_RATIOS = {"original", "16:9", "9:16", "1:1", "4:5"}
OUTPUT_HEIGHTS = {480, 720, 1080}

RATIO_MAP = {
    "16:9": (16, 9),
    "9:16": (9, 16),
    "1:1": (1, 1),
    "4:5": (4, 5),
}


def normalize_aspect_ratio(value: str | None) -> str:
    if value in ASPECT_RATIOS:
        return value
    return "original"


def normalize_output_height(value: str | int | None) -> int:
    try:
        height = int(value) if value is not None else 1080
    except (TypeError, ValueError):
        height = 1080
    return height if height in OUTPUT_HEIGHTS else 1080


def normalize_focus(value: str | float | None, default: float = 0.5) -> float:
    try:
        focus = float(value) if value is not None else default
    except (TypeError, ValueError):
        focus = default
    return max(0.0, min(1.0, focus))


def get_output_dimensions(aspect_ratio: str, output_height: int) -> tuple[int, int] | None:
    if aspect_ratio == "original":
        return None

    ratio = RATIO_MAP.get(aspect_ratio)
    if not ratio:
        return None

    width_ratio, height_ratio = ratio
    short_edge = output_height - (output_height % 2)

    if width_ratio >= height_ratio:
        height = short_edge
        width = round(height * width_ratio / height_ratio)
    else:
        width = short_edge
        height = round(width * height_ratio / width_ratio)

    width -= width % 2
    height -= height % 2
    return width, height


def build_video_filter(
    aspect_ratio: str,
    output_height: int,
    crop_focus_x: float = 0.5,
    crop_focus_y: float = 0.5,
) -> str | None:
    dimensions = get_output_dimensions(aspect_ratio, output_height)
    if not dimensions:
        return None

    out_w, out_h = dimensions
    focus_x = normalize_focus(crop_focus_x)
    focus_y = normalize_focus(crop_focus_y)

    return (
        f"scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
        f"crop={out_w}:{out_h}:(iw-{out_w})*{focus_x}:(ih-{out_h})*{focus_y}"
    )
