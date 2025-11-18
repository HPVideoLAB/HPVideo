import logging
from fastapi import (
    FastAPI,
    Request,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from fastapi.responses import FileResponse

from fastapi.middleware.cors import CORSMiddleware
# from faster_whisper import WhisperModel
from pydantic import BaseModel


import requests
import hashlib
from pathlib import Path
import json


from constants import ERROR_MESSAGES
from utils.utils import (
    get_current_user,
    get_verified_user,
    get_admin_user,
)
from utils.misc import calculate_sha256

from config import (
    SRC_LOG_LEVELS,
    CACHE_DIR,
    DEVICE_TYPE,
    AUDIO_OPENAI_API_BASE_URL,
    AUDIO_OPENAI_API_KEY,
    AUDIO_OPENAI_API_MODEL,
    AUDIO_OPENAI_API_VOICE,
    AppConfig,
)

log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["AUDIO"])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.config = AppConfig()
app.state.config.OPENAI_API_BASE_URL = AUDIO_OPENAI_API_BASE_URL
app.state.config.OPENAI_API_KEY = AUDIO_OPENAI_API_KEY
app.state.config.OPENAI_API_MODEL = AUDIO_OPENAI_API_MODEL
app.state.config.OPENAI_API_VOICE = AUDIO_OPENAI_API_VOICE

# setting device type for whisper model
whisper_device_type = DEVICE_TYPE if DEVICE_TYPE and DEVICE_TYPE == "cuda" else "cpu"
log.info(f"whisper_device_type: {whisper_device_type}")

SPEECH_CACHE_DIR = Path(CACHE_DIR).joinpath("./audio/speech/")
SPEECH_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class OpenAIConfigUpdateForm(BaseModel):
    url: str
    key: str
    model: str
    speaker: str


@app.get("/config")
async def get_openai_config(user=Depends(get_admin_user)):
    return {
        "OPENAI_API_BASE_URL": app.state.config.OPENAI_API_BASE_URL,
        "OPENAI_API_KEY": app.state.config.OPENAI_API_KEY,
        "OPENAI_API_MODEL": app.state.config.OPENAI_API_MODEL,
        "OPENAI_API_VOICE": app.state.config.OPENAI_API_VOICE,
    }


@app.post("/config/update")
async def update_openai_config(
    form_data: OpenAIConfigUpdateForm, user=Depends(get_admin_user)
):
    if form_data.key == "":
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES.API_KEY_NOT_FOUND)

    app.state.config.OPENAI_API_BASE_URL = form_data.url
    app.state.config.OPENAI_API_KEY = form_data.key
    app.state.config.OPENAI_API_MODEL = form_data.model
    app.state.config.OPENAI_API_VOICE = form_data.speaker

    return {
        "status": True,
        "OPENAI_API_BASE_URL": app.state.config.OPENAI_API_BASE_URL,
        "OPENAI_API_KEY": app.state.config.OPENAI_API_KEY,
        "OPENAI_API_MODEL": app.state.config.OPENAI_API_MODEL,
        "OPENAI_API_VOICE": app.state.config.OPENAI_API_VOICE,
    }


@app.post("/speech")
async def speech(request: Request, user=Depends(get_verified_user)):
    body = await request.body()
    name = hashlib.sha256(body).hexdigest()

    file_path = SPEECH_CACHE_DIR.joinpath(f"{name}.mp3")
    file_body_path = SPEECH_CACHE_DIR.joinpath(f"{name}.json")

    # Check if the file already exists in the cache
    if file_path.is_file():
        return FileResponse(file_path)

    headers = {}
    headers["Authorization"] = f"Bearer {app.state.config.OPENAI_API_KEY}"
    headers["Content-Type"] = "application/json"

    r = None
    try:
        r = requests.post(
            url=f"{app.state.config.OPENAI_API_BASE_URL}/audio/speech",
            data=body,
            headers=headers,
            stream=True,
        )

        r.raise_for_status()

        # Save the streaming content to a file
        with open(file_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

        with open(file_body_path, "w") as f:
            json.dump(json.loads(body.decode("utf-8")), f)

        # Return the saved file
        return FileResponse(file_path)

    except Exception as e:
        log.exception(e)
        error_detail = "HPVideo: Server Connection Error"
        if r is not None:
            try:
                res = r.json()
                if "error" in res:
                    error_detail = f"External: {res['error']['message']}"
            except:
                error_detail = f"External: {e}"

        raise HTTPException(
            status_code=r.status_code if r != None else 500,
            detail=error_detail,
        )


@app.post("/transcriptions")
def transcribe(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    log.info(f"file.content_type: {file.content_type}")
    return {"text": ""}
