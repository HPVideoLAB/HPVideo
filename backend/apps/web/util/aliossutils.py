import oss2
import os
import datetime
import uuid
import base64
import logging

log = logging.getLogger(__name__)

# OSS credentials. Read on demand (not at import) so the module loads
# in CI / smoke-test environments where these aren't set without
# crashing every router that imports it transitively.
access_key_id = os.getenv("FILE_ACCESS_KEY_ID")
access_key_secret = os.getenv("FILE_ACCESS_KEY_SECRET")
endpoint = os.getenv("FILE_HK_ENDPOINT")
bucket_name = os.getenv("FILE_BUCKET_HK_NAME")
oss_url = os.getenv("FILE_OSS_HK_URL")


class AliOssUtils:
    def __init__(self):
        # Lazy: bucket is built on first use, so missing env vars only
        # surface when someone actually calls upload_base64_to_oss(),
        # not at module import time.
        self._bucket = None

    def _get_bucket(self):
        if self._bucket is None:
            if not (access_key_id and access_key_secret and endpoint and bucket_name):
                raise RuntimeError(
                    "AliOSS env vars not set — FILE_ACCESS_KEY_ID, "
                    "FILE_ACCESS_KEY_SECRET, FILE_HK_ENDPOINT, "
                    "FILE_BUCKET_HK_NAME are required."
                )
            auth = oss2.Auth(access_key_id, access_key_secret)
            self._bucket = oss2.Bucket(auth, endpoint, bucket_name)
        return self._bucket

    def upload_base64_to_oss(self, base64_str):
        try:
            now = datetime.datetime.now()
            formatted_date = now.strftime("%Y/%m/%d")
            file_name = f"{formatted_date}/audio_{uuid.uuid4()}.wav"

            if "," in base64_str:
                base64_str = base64_str.split(",")[1]

            audio_data = base64.b64decode(base64_str)

            result = self._get_bucket().put_object(
                file_name, audio_data, headers={"Content-Type": "audio/wav"}
            )

            if result.status == 200:
                return f"{oss_url}{file_name}"
            else:
                return None
        except Exception as e:
            log.error("OSS upload error: %s", e)
            return None


AliOSSUtil = AliOssUtils()
