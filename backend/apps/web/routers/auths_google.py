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

    WALLET_DERIVATION_SECRET env var. MUST be a dedicated 32+ byte
    secret distinct from WEBUI_SECRET_KEY (the JWT signing key).
    Sharing them turns a JWT-key leak into a wallet-key compromise
    for every Google user. Endpoint returns 503 if not set.
"""
import os
import hmac
import hashlib
import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from eth_account import Account

from config import JWT_EXPIRES_IN
from apps.web.models.auths import Auths
from apps.web.models.users import Users
from utils.utils import create_token, get_password_hash
from utils.misc import parse_duration

log = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
# Wallet-derivation secret MUST be distinct from WEBUI_SECRET_KEY (the
# JWT signing key). Sharing them turns a JWT-key leak into a
# wallet-key compromise for every Google user. Endpoint refuses to
# operate without an explicitly-set value.
WALLET_DERIVATION_SECRET = os.getenv("WALLET_DERIVATION_SECRET", "")


class GoogleSigninForm(BaseModel):
    id_token: str
    device_id: str = ""
    inviter_id: str = ""
    channel: str = "google"


def _derive_private_key(google_sub: str) -> str:
    """HKDF-SHA256(secret, salt=sub) -> 32-byte private key.

    HKDF gives us salt-binding (different sub -> different key) plus a
    proper extract-and-expand structure, which is harder to brute-force
    if the secret ever leaks compared to a single-round sha256.
    """
    if not WALLET_DERIVATION_SECRET:
        raise RuntimeError("WALLET_DERIVATION_SECRET must be set")
    secret = WALLET_DERIVATION_SECRET.encode("utf-8")
    salt = google_sub.encode("utf-8")
    info = b"hpvideo-wallet-v1"
    # HKDF extract.
    prk = hmac.new(salt, secret, hashlib.sha256).digest()
    # HKDF expand to one block (32 bytes) — sufficient for an EC private
    # key. info pins this derivation to wallet-v1 so a future schema
    # rotation produces a different key for the same (sub, secret).
    okm = hmac.new(prk, info + b"\x01", hashlib.sha256).digest()
    return "0x" + okm.hex()


@router.post("/googleSignIn")
@limiter.limit("5/minute")
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
            "WALLET_DERIVATION_SECRET missing — set it to a 32+ byte value distinct from WEBUI_SECRET_KEY.",
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
        # Don't echo the validator's message — it can leak internals
        # like accepted audiences, expiry windows, or signing-key URLs.
        # Log it server-side for debugging, return a generic 401.
        log.warning("googleSignIn: id_token verification failed: %s", exc)
        raise HTTPException(401, "Invalid Google token.")

    # Defense-in-depth: pin issuer explicitly, in case the google-auth
    # library ever loosens its defaults in a refactor.
    iss = idinfo.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Google token issuer mismatch.")

    google_sub = idinfo.get("sub")
    email = idinfo.get("email", "")
    if not google_sub:
        raise HTTPException(401, "Google token missing sub claim.")

    private_key = _derive_private_key(google_sub)
    account = Account.from_key(private_key)
    address = account.address.lower()

    user = Users.get_user_by_id(address)
    is_first_time = False
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
        # insert_new_auth returns (user, total_user_count). We don't use
        # the count here — the create-vs-returning distinction lives in
        # is_first_time, which is set explicitly so future readers don't
        # have to puzzle out that "user_count is not None" meant "newly
        # created".
        user, _ = result
        is_first_time = True

    # Email is intentionally NOT written to the user row here. There is
    # no users.update_email_by_id helper, and writing without a
    # uniqueness check across the existing email column would let any
    # Google-signed user overwrite another account's email. The sub
    # itself is stable; receipts can ride on it.

    # Issue a JWT bound to the same expiry policy walletSignIn uses, so
    # tokens aren't immortal.
    token = create_token(
        data={"id": user.id, "email": user.email, "role": user.role},
        expires_delta=parse_duration(JWT_EXPIRES_IN),
    )

    # The deterministic private key is returned ONLY when the wallet is
    # being created for the first time, so the client can render the
    # back-up-now reveal screen. Returning users get only address+token,
    # which the existing localStorage keystore is enough to operate on.

    response: dict = {
        "address": address,
        "email": email,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "profile_image_url": user.profile_image_url,
        },
        "first_time": is_first_time,
    }
    if is_first_time:
        response["privateKey"] = private_key
    return response
