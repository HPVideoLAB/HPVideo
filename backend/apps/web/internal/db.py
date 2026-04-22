from peewee import *
from peewee_migrate import Router
from playhouse.db_url import connect, register_database
from playhouse.pool import PooledPostgresqlExtDatabase, PooledMySQLDatabase, PooledSqliteDatabase
from config import SRC_LOG_LEVELS, DATA_DIR
import os
import logging
import functools


log = logging.getLogger(__name__)
log.setLevel(SRC_LOG_LEVELS["DB"])

# Check if the file exists
if os.path.exists(f"{DATA_DIR}/ollama.db"):
    # Rename the file
    os.rename(f"{DATA_DIR}/ollama.db", f"{DATA_DIR}/webui.db")
    log.info("Database migrated from Ollama-WebUI successfully.")

# Register pooled database schemes so that playhouse.db_url.connect()
# returns a pooled connection for pool+postgresql:// / pool+mysql:// URLs.
register_database(PooledPostgresqlExtDatabase, "postgres+pool", "postgresql+pool")
register_database(PooledMySQLDatabase, "mysql+pool")
register_database(PooledSqliteDatabase, "sqlite+pool")

DATABASE_URL = os.getenv("DATABASE_URL")

# Pool configuration via env vars (sane defaults). Only forwarded when the
# URL scheme is a pooled scheme, because plain PostgresqlDatabase /
# MySQLDatabase / SqliteDatabase forward unknown kwargs to the driver as
# DSN options, and psycopg2 rejects `max_connections` there.
DB_MAX_CONNECTIONS = int(os.getenv("DB_MAX_CONNECTIONS", "20"))
DB_STALE_TIMEOUT = int(os.getenv("DB_STALE_TIMEOUT", "300"))  # 5 min

_is_pool_url = (DATABASE_URL or "").split("://", 1)[0].endswith("+pool")
_connect_kwargs = (
    {"max_connections": DB_MAX_CONNECTIONS, "stale_timeout": DB_STALE_TIMEOUT}
    if _is_pool_url
    else {}
)
DB = connect(DATABASE_URL, **_connect_kwargs)
log.info(
    f"Connected to {DB.__class__.__name__} "
    f"(pool={'on' if _is_pool_url else 'off'})"
)

router = Router(DB, migrate_dir="apps/web/internal/migrations", logger=log)
router.run()


# Use peewee's connection context to ensure each request checks out a
# connection from the pool and returns it, instead of open/close per-call.
def aspect_database_operations(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with DB.connection_context():
            try:
                return func(*args, **kwargs)
            except Exception as e:
                log.error(f"DB operation failed in {func.__name__}: {e}")
                raise
    return wrapper
