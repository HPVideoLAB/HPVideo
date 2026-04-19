import base64
import logging
import re
from fastapi import APIRouter, HTTPException, status
from apps.web.util.aliossutils import AliOSSUtil
from apps.web.models.fileupload import UploadBase

log = logging.getLogger(__name__)

router = APIRouter()

# Size limit: 20 MB (raw file size; base64-encoded payload is ~4/3 larger)
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_BASE64_CHARS = int(MAX_FILE_BYTES * 4 / 3) + 1024  # rough upper bound

# Whitelisted MIME types for uploads
ALLOWED_MIME_PREFIXES = (
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "audio/wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
)

# Extract MIME type from a data URL: data:<mime>;base64,<payload>
_DATA_URL_RE = re.compile(r"^data:([\w+.\-/]+);base64,(.+)$", re.DOTALL)


@router.post("/base")
async def upload_base64(upload: UploadBase):
    payload = upload.data or ""

    # 1. Reject obviously oversized strings before decoding (cheap).
    if len(payload) > MAX_BASE64_CHARS:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB)",
        )

    # 2. If a data URL was sent, validate MIME and strip prefix.
    m = _DATA_URL_RE.match(payload.strip())
    mime = None
    if m:
        mime, b64_body = m.group(1), m.group(2)
        if not any(mime.startswith(p) for p in ALLOWED_MIME_PREFIXES):
            raise HTTPException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Disallowed MIME type: {mime}",
            )
    else:
        b64_body = payload

    # 3. Decode and check actual byte size. Invalid base64 -> 400.
    try:
        decoded = base64.b64decode(b64_body, validate=True)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid base64 payload")

    if len(decoded) > MAX_FILE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload too large (max {MAX_FILE_BYTES // (1024 * 1024)} MB)",
        )

    # 4. Pass through to OSS. Pass the original data string so behaviour is unchanged.
    file_url = AliOSSUtil.upload_base64_to_oss(upload.data)
    return file_url
