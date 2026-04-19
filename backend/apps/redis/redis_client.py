import redis
import json
import logging
import os

log = logging.getLogger(__name__)

REDIS_HOST = os.environ.get("REDIS_HOST")
REDIS_PORT = os.environ.get("REDIS_PORT")
REDIS_DB = os.environ.get("REDIS_DB")
REDIS_PWD = os.environ.get("REDIS_PWD")


class RedisClient:
    def __init__(self, host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, password=REDIS_PWD):
        self.redis_client = None
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            self.redis_client.ping()
            log.info("Successfully connected to the Redis server")
        except Exception as e:
            log.warning(f"Failed to connect to the Redis server: {e}")
            self.redis_client = None

    def add_key_value(self, key, value, ttl=None):
        """Store value as JSON. `ttl` is optional seconds; None => no expiry."""
        if self.redis_client is None:
            return False
        try:
            value_json = json.dumps(value)
            if ttl is not None:
                return self.redis_client.setex(key, int(ttl), value_json)
            return self.redis_client.set(key, value_json)
        except Exception as e:
            log.error(f"Redis add_key_value error: {e}")
            return False

    def get_value_by_key(self, key):
        if self.redis_client is None:
            return None
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            return json.loads(value)
        except Exception as e:
            log.error(f"Redis get_value_by_key error: {e}")
            return None

    def delete_key(self, key):
        if self.redis_client is None:
            return 0
        try:
            return self.redis_client.delete(key)
        except Exception as e:
            log.error(f"Redis delete_key error: {e}")
            return 0


RedisClientInstance = RedisClient()