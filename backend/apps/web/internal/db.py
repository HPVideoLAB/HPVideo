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

# Pool configuration via env vars (sane defaults)
DB_MAX_CONNECTIONS = int(os.getenv("DB_MAX_CONNECTIONS", "20"))
DB_STALE_TIMEOUT = int(os.getenv("DB_STALE_TIMEOUT", "300"))  # 5 min

DB = connect(
    DATABASE_URL,
    max_connections=DB_MAX_CONNECTIONS,
    stale_timeout=DB_STALE_TIMEOUT,
)
log.info(
    f"Connected to {DB.__class__.__name__} "
    f"(max_connections={DB_MAX_CONNECTIONS}, stale_timeout={DB_STALE_TIMEOUT}s)"
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
