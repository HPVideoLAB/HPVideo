"""
Google OAuth sign-in -> deterministic wallet for the user.

Phase 2 of the wallet redesign: replaces "connect MetaMask" friction
with a single "Continue with Google" click. The wallet is derived
deterministically from the Google `sub` claim + a server-side secret,
so the same Google account always opens the same wallet — no DB
storage required, no email-recovery flow needed.

Trade-off: if the server secret leaks, every Google-derived wallet is
compromised. A future iteration can split the derivation between
server and a user-side passphrase (or move to a real KMS-encrypted DB
backup) to mitigate.

Endpoint requires:
    GOOGLE_CLIENT_ID env var (the Web client ID from Google Cloud
    Console). If not set, the endpoint returns 503 so the
    frontend can fall back to a 'coming soon' state.

    WALLET_DERIVATION_SECRET env var. Falls back to WEBUI_SECRET_KEY
    when not set, but you should set it to a dedicated 32+ byte secret
    in production.
"""
import os
import hashlib
import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from eth_account import Account

from apps.web.models.auths import Auths
from apps.web.models.users import Users
from utils.utils import create_token, get_password_hash

log = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
WALLET_DERIVATION_SECRET = (
    os.getenv("WALLET_DERIVATION_SECRET")
    or os.getenv("WEBUI_SECRET_KEY")
    or ""
)


class GoogleSigninForm(BaseModel):
    id_token: str
    device_id: str = ""
    inviter_id: str = ""
    channel: str = "google"


def _derive_private_key(google_sub: str) -> str:
    """sha256(sub | secret) -> 32-byte private key."""
    if not WALLET_DERIVATION_SECRET:
        raise RuntimeError("WALLET_DERIVATION_SECRET / WEBUI_SECRET_KEY must be set")
    digest = hashlib.sha256(
        f"{google_sub}|{WALLET_DERIVATION_SECRET}".encode("utf-8")
    ).digest()
    return "0x" + digest.hex()


@router.post("/googleSignIn")
@limiter.limit("10/minute")
async def google_sign_in(request: Request, form_data: GoogleSigninForm):
    """
    Verifies a Google id_token, derives a deterministic wallet, ensures
    a User row exists, and returns the wallet + a JWT.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google login is not configured on this server.",
        )
    if not WALLET_DERIVATION_SECRET:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "WALLET_DERIVATION_SECRET / WEBUI_SECRET_KEY missing.",
        )

    # Lazy-import google-auth so the rest of the app boots even if the
    # dependency is missing in a developer environment.
    try:
        from google.oauth2 import id_token as google_id_token  # type: ignore
        from google.auth.transport import requests as google_requests  # type: ignore
    except ImportError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "google-auth library is not installed on this server.",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            form_data.id_token,
            google_requests.Request(),
            audience=GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(401, f"Invalid Google token: {exc}")

    google_sub = idinfo.get("sub")
    email = idinfo.get("email", "")
    if not google_sub:
        raise HTTPException(401, "Google token missing sub claim.")

    private_key = _derive_private_key(google_sub)
    account = Account.from_key(private_key)
    address = account.address.lower()

    user = Users.get_user_by_id(address)
    user_count = None
    if not user:
        log.info("googleSignIn: creating new user for %s (sub=%s)", address, google_sub)
        hashed = get_password_hash("")
        result = Auths.insert_new_auth(
            email or "",
            hashed,
            address,
            "",
            "walletUser",
            address,
            form_data.inviter_id,
            address_type="google",
            address=address,
            channel=form_data.channel or "google",
        )
        if not result:
            raise HTTPException(500, "Failed to create user.")
        user, user_count = result

    # Persist the email on the user so account recovery / receipts can
    # find them later. Only update if we actually got an email back.
    if email and getattr(user, "email", None) != email:
        try:
            Users.update_user_email_by_id(user.id, email)
        except Exception:
            # Non-fatal — the wallet still works without the email update.
            pass

    token = create_token(
        data={"id": user.id, "email": user.email, "role": user.role},
    )

    return {
        "address": address,
        "privateKey": private_key,
        "email": email,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "profile_image_url": user.profile_image_url,
        },
        "first_time": user_count is not None,
    }
