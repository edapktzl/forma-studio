from io import BytesIO

from PIL import Image

import pytest
from fastapi import HTTPException

from app.routers.media import decode_image, decode_video


def test_decode_image_keeps_original_bytes_without_orientation_transform():
    source = Image.new("RGB", (32, 24), (180, 120, 80))
    raw = BytesIO()
    source.save(raw, format="JPEG", quality=95)
    data, (mime, suffix) = decode_image(raw.getvalue(), "studio.jpg", "image/jpeg")

    assert data == raw.getvalue()
    assert (mime, suffix) == ("image/jpeg", ".jpg")


def test_decode_video_accepts_mp4_signature_without_reencoding():
    data = b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00" + b"video-data"
    output, (mime, suffix) = decode_video(data, "hero.mp4", "video/mp4")

    assert output == data
    assert (mime, suffix) == ("video/mp4", ".mp4")


def test_decode_video_rejects_renamed_non_mp4_files():
    with pytest.raises(HTTPException) as error:
        decode_video(b"not a video", "hero.mp4", "video/mp4")

    assert error.value.status_code == 415
