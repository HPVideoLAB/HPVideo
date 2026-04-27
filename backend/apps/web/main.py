import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from apps.web.routers import (
    auths,
    auths_google,
    users,
    chats,
    documents,
    modelfiles,
    prompts,
    configs,
    utils,
    device,
    ip_log,
    conversation,
    completion,
    daily_users,
    fileupload,
    x402pay,
    bnbpay,
    pointpay,
)

from config import (
    WEBUI_AUTH,
    DEFAULT_MODELS,
    DEFAULT_PROMPT_SUGGESTIONS,
    DEFAULT_USER_ROLE,
    ENABLE_SIGNUP,
    USER_PERMISSIONS,
    WEBHOOK_URL,
    WEBUI_AUTH_TRUSTED_EMAIL_HEADER,
    JWT_EXPIRES_IN,
    AppConfig,
)


app = FastAPI()

# CORS: whitelist specific origins from env var (comma-separated).
# Falls back to safe localhost-only defaults if not configured.
_cors_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
origins = [o.strip() for o in _cors_env.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]

# Rate limiter: defaults to 100/min per IP, stricter limits on auth/payment endpoints
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.state.config = AppConfig()

app.state.config.ENABLE_SIGNUP = ENABLE_SIGNUP
app.state.config.JWT_EXPIRES_IN = JWT_EXPIRES_IN

app.state.config.DEFAULT_MODELS = DEFAULT_MODELS
app.state.config.DEFAULT_PROMPT_SUGGESTIONS = DEFAULT_PROMPT_SUGGESTIONS
app.state.config.DEFAULT_USER_ROLE = DEFAULT_USER_ROLE
app.state.config.USER_PERMISSIONS = USER_PERMISSIONS
app.state.config.WEBHOOK_URL = WEBHOOK_URL
app.state.AUTH_TRUSTED_EMAIL_HEADER = WEBUI_AUTH_TRUSTED_EMAIL_HEADER


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# Apply payment middleware to specific routes
app.middleware("http")(x402pay.payment_middleware)

app.include_router(auths.router, prefix="/auths", tags=["auths"])
# Google sign-in lives on /auths/* too so the frontend hits a single namespace.
app.include_router(auths_google.router, prefix="/auths", tags=["auths"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(chats.router, prefix="/chats", tags=["chats"])

app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(modelfiles.router, prefix="/modelfiles", tags=["modelfiles"])
app.include_router(prompts.router, prefix="/prompts", tags=["prompts"])


app.include_router(configs.router, prefix="/configs", tags=["configs"])
app.include_router(utils.router, prefix="/utils", tags=["utils"])


app.include_router(device.router, prefix="/devices", tags=["devices"])
app.include_router(ip_log.router, prefix="/ip_logs", tags=["ip_logs"])
app.include_router(conversation.router, prefix="/conversation", tags=["conversation"])

app.include_router(completion.router, prefix="/chat", tags=["aliqwen"])
app.include_router(daily_users.router, prefix="/daily", tags=["daily_users"])
app.include_router(fileupload.router, prefix="/upload", tags=["aliupload"])
app.include_router(x402pay.router, prefix="/x402", tags=["x402pay"])
app.include_router(bnbpay.router, prefix="/bnbpay", tags=["bnbpay"])
app.include_router(pointpay.router, prefix="/pointpay", tags=["pointpay"])


from apps.redis.redis_client import RedisClientInstance

STATUS_CACHE_KEY = "webui:status"
STATUS_CACHE_TTL = 60  # seconds


@app.get("/")
async def get_status():
    # Try Redis first; fall through on any cache miss / error.
    cached = RedisClientInstance.get_value_by_key(STATUS_CACHE_KEY)
    if cached is not None:
        return cached

    payload = {
        "status": True,
        "auth": WEBUI_AUTH,
        "default_models": app.state.config.DEFAULT_MODELS,
        "default_prompt_suggestions": app.state.config.DEFAULT_PROMPT_SUGGESTIONS,
    }
    RedisClientInstance.add_key_value(STATUS_CACHE_KEY, payload, ttl=STATUS_CACHE_TTL)
    return payload


@app.get("/healthz")
async def healthz():
    # Liveness probe: zero dependencies, instant 200. Used by the
    # post-deploy smoke step and k8s liveness probes — must NOT touch
    # Redis or Postgres so a degraded dependency doesn't roll the pod.
    # Confirms only that the FastAPI process is up and routing.
    return {"ok": True}
