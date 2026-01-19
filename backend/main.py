import json
import time
import os
import sys
import logging
import aiohttp

from fastapi import FastAPI, Request, Depends, status
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse, Response
from starlette.requests import Request


from apps.audio.main import app as audio_app
from apps.images.main import app as images_app
from apps.web.main import app as webui_app

from pydantic import BaseModel
from typing import List


from utils.utils import get_admin_user

from config import (
    CONFIG_DATA,
    WEBUI_NAME,
    WEBUI_URL,
    WEBUI_AUTH,
    ENV,
    VERSION,
    CHANGELOG,
    FRONTEND_BUILD_DIR,
    CACHE_DIR,
    STATIC_DIR,
    ENABLE_MODEL_FILTER,
    MODEL_FILTER_LIST,
    GLOBAL_LOG_LEVEL,
    SRC_LOG_LEVELS,
    WEBHOOK_URL,
    ENABLE_ADMIN_EXPORT,
    AppConfig,
)
from constants import ERROR_MESSAGES

logging.basicConfig(stream=sys.stdout, level=GLOBAL_LOG_LEVEL)
log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["MAIN"])


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except (HTTPException, StarletteHTTPException) as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            else:
                raise ex


print(
    rf"""
  ___                    __        __   _     _   _ ___ 
 / _ \ _ __   ___ _ __   \ \      / /__| |__ | | | |_ _|
| | | | '_ \ / _ \ '_ \   \ \ /\ / / _ \ '_ \| | | || | 
| |_| | |_) |  __/ | | |   \ V  V /  __/ |_) | |_| || | 
 \___/| .__/ \___|_| |_|    \_/\_/ \___|_.__/ \___/|___|
      |_|                                               

      
v{VERSION} - building the best open-source AI user interface.      
https://github.com/open-webui/open-webui
"""
)

# bnb usdt pay listener
from apps.listener.bnbusdt import BNBUSDTPayListenerInstance
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("FastAPI Server Running，Start USDT Listener...")
    listener_task = asyncio.create_task(BNBUSDTPayListenerInstance.start_listening())
    yield
    listener_task.cancel()
    await listener_task
    print("===============bnb usdt pay close===============")


app = FastAPI(
    root_path="/creator",
    docs_url="/docs" if ENV == "dev" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.config = AppConfig()
app.state.config.ENABLE_MODEL_FILTER = ENABLE_MODEL_FILTER
app.state.config.MODEL_FILTER_LIST = MODEL_FILTER_LIST

app.state.config.WEBHOOK_URL = WEBHOOK_URL

origins = ["*"]


class RAGMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and (
            "/api/chat" in request.url.path or "/chat/completions" in request.url.path
        ):
            log.debug(f"request.url.path: {request.url.path}")

            # Read the original request body
            body = await request.body()
            # Decode body to string
            body_str = body.decode("utf-8")
            # Parse string to JSON
            data = json.loads(body_str) if body_str else {}

            if "citations" in data:
                del data["citations"]

            modified_body_bytes = json.dumps(data).encode("utf-8")

            # Replace the request body with the modified one
            request._body = modified_body_bytes

            # Set custom header to ensure content-length matches new body length
            request.headers.__dict__["_list"] = [
                (b"content-length", str(len(modified_body_bytes)).encode("utf-8")),
                *[
                    (k, v)
                    for k, v in request.headers.raw
                    if k.lower() != b"content-length"
                ],
            ]

        response = await call_next(request)

        return response

    async def _receive(self, body: bytes):
        return {"type": "http.request", "body": body, "more_body": False}


app.add_middleware(RAGMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def check_url(request: Request, call_next):
    start_time = int(time.time())
    response = await call_next(request)
    process_time = int(time.time()) - start_time
    response.headers["X-Process-Time"] = str(process_time)

    return response


# ====== Nest 反向代理（放在 app.mount 之前） ======
NEST_ORIGIN = os.getenv("NEST_ORIGIN", "http://127.0.0.1:3008")


HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}


def _filter_headers(headers):
    out = {}
    for k, v in headers.items():
        if k.lower() in HOP_BY_HOP_HEADERS:
            continue
        out[k] = v
    return out


async def _proxy_to_nest(path: str, request: Request):
    # 你的 Nest 设置了 app.setGlobalPrefix('nest')，所以这里需要 /nest
    upstream_url = f"{NEST_ORIGIN}/nest/{path}"

    headers = _filter_headers(request.headers)
    params = dict(request.query_params)
    body = await request.body()

    # 🔥🔥🔥 核心修改在这里：改为 300秒 (5分钟) 🔥🔥🔥
    # 之前可能是 120 或者默认值，导致上传大文件时 Python 层断开连接
    timeout = aiohttp.ClientTimeout(total=3000)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.request(
            method=request.method,
            url=upstream_url,
            params=params,
            data=body,
            headers=headers,
        ) as r:
            # 保持你原来的逻辑（等待全部读取完毕再返回），简单稳定
            content = await r.read()
            resp_headers = _filter_headers(r.headers)
            return Response(content=content, status_code=r.status, headers=resp_headers)


@app.api_route(
    "/nest-proxy/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def nest_proxy(path: str, request: Request):
    return await _proxy_to_nest(path, request)


# ====== 代理结束 ======


app.mount("/images/api/v1", images_app)
app.mount("/audio/api/v1", audio_app)

app.mount("/api/v1", webui_app)


@app.get("/api/config")
async def get_app_config():
    # Checking and Handling the Absence of 'ui' in CONFIG_DATA

    default_locale = "en-US"
    if "ui" in CONFIG_DATA:
        default_locale = CONFIG_DATA["ui"].get("default_locale", "en-US")

    # The Rest of the Function Now Uses the Variables Defined Above
    return {
        "status": True,
        "name": WEBUI_NAME,
        "version": VERSION,
        "auth": WEBUI_AUTH,
        "default_locale": default_locale,
        "images": images_app.state.config.ENABLED,
        "default_models": webui_app.state.config.DEFAULT_MODELS,
        "default_prompt_suggestions": webui_app.state.config.DEFAULT_PROMPT_SUGGESTIONS,
        "trusted_header_auth": bool(webui_app.state.AUTH_TRUSTED_EMAIL_HEADER),
        "admin_export_enabled": ENABLE_ADMIN_EXPORT,
    }


@app.get("/api/config/model/filter")
async def get_model_filter_config(user=Depends(get_admin_user)):
    return {
        "enabled": app.state.config.ENABLE_MODEL_FILTER,
        "models": app.state.config.MODEL_FILTER_LIST,
    }


class ModelFilterConfigForm(BaseModel):
    enabled: bool
    models: List[str]


@app.post("/api/config/model/filter")
async def update_model_filter_config(
    form_data: ModelFilterConfigForm, user=Depends(get_admin_user)
):
    app.state.config.ENABLE_MODEL_FILTER = form_data.enabled
    app.state.config.MODEL_FILTER_LIST = form_data.models

    return {
        "enabled": app.state.config.ENABLE_MODEL_FILTER,
        "models": app.state.config.MODEL_FILTER_LIST,
    }


@app.get("/api/webhook")
async def get_webhook_url(user=Depends(get_admin_user)):
    return {
        "url": app.state.config.WEBHOOK_URL,
    }


class UrlForm(BaseModel):
    url: str


@app.post("/api/webhook")
async def update_webhook_url(form_data: UrlForm, user=Depends(get_admin_user)):
    app.state.config.WEBHOOK_URL = form_data.url

    webui_app.state.WEBHOOK_URL = app.state.config.WEBHOOK_URL

    return {
        "url": app.state.config.WEBHOOK_URL,
    }


@app.get("/api/version")
async def get_app_config():
    return {
        "version": VERSION,
    }


@app.get("/api/changelog")
async def get_app_changelog():
    return {key: CHANGELOG[key] for idx, key in enumerate(CHANGELOG) if idx < 5}


@app.get("/api/version/updates")
async def get_app_latest_release_version():
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.github.com/repos/open-webui/open-webui/releases/latest"
            ) as response:
                response.raise_for_status()
                data = await response.json()
                latest_version = data["tag_name"]

                return {"current": VERSION, "latest": latest_version[1:]}
    except aiohttp.ClientError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        )


@app.get("/manifest.json")
async def get_manifest_json():
    return {
        "name": WEBUI_NAME,
        "short_name": WEBUI_NAME,
        "start_url": "/",
        "display": "standalone",
        "background_color": "#343541",
        "theme_color": "#343541",
        "orientation": "portrait-primary",
        "icons": [
            {"src": "/creator/static/logo.png", "type": "image/png", "sizes": "500x500"}
        ],
    }


@app.get("/opensearch.xml")
async def get_opensearch_xml():
    xml_content = rf"""
    <OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
    <ShortName>{WEBUI_NAME}</ShortName>
    <Description>Search {WEBUI_NAME}</Description>
    <InputEncoding>UTF-8</InputEncoding>
    <Image width="16" height="16" type="image/x-icon">{WEBUI_URL}/favicon.png</Image>
    <Url type="text/html" method="get" template="{WEBUI_URL}/?q={"{searchTerms}"}"/>
    <moz:SearchForm>{WEBUI_URL}</moz:SearchForm>
    </OpenSearchDescription>
    """
    return Response(content=xml_content, media_type="application/xml")


@app.get("/health")
async def healthcheck():
    return {"status": True}


@app.get("/invite/{id}")
def redirect_to_url(request: Request, id: str):
    headers = request.headers
    host = headers.get("host")
    # 替换成你想要跳转到的网址
    return RedirectResponse(url=f"https://{host}?inviter={id}")


@app.get("/channel/{name}")
def redirect_to_url(request: Request, name: str):
    headers = request.headers
    host = headers.get("host")
    # 替换成你想要跳转到的网址
    return RedirectResponse(url=f"https://{host}?channel={name}")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/cache", StaticFiles(directory=CACHE_DIR), name="cache")

if os.path.exists(FRONTEND_BUILD_DIR):
    app.mount(
        "/",
        SPAStaticFiles(directory=FRONTEND_BUILD_DIR, html=True),
        name="spa-static-files",
    )
else:
    log.warning(
        f"Frontend build directory not found at '{FRONTEND_BUILD_DIR}'. Serving API only."
    )


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    print(f"Path: {request.url.path}, Process Time: {process_time:.2f}s")
    return response


@app.middleware("http")
async def add_process_time_and_error_logging(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        print(f"Path: {request.url.path}, Process Time: {process_time:.2f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        log.error(
            f"Path: {request.url.path}, Error: {str(e)}, Process Time: {process_time:.2f}s"
        )
        raise  # 重新抛出异常，让 FastAPI 的错误处理器处理它
