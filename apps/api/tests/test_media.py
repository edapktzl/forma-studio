from io import BytesIO

from PIL import Image

from app.routers.media import decode_image


def test_decode_image_keeps_original_bytes_without_orientation_transform():
    source = Image.new("RGB", (32, 24), (180, 120, 80))
    raw = BytesIO()
    source.save(raw, format="JPEG", quality=95)
    data, (mime, suffix) = decode_image(raw.getvalue(), "studio.jpg", "image/jpeg")

    assert data == raw.getvalue()
    assert (mime, suffix) == ("image/jpeg", ".jpg")
