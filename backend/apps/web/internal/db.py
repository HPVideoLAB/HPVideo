from peewee import *
from peewee_migrate import Router
from playhouse.db_url import connect
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
else:
    pass

# from dotenv import load_dotenv
# load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB = connect(DATABASE_URL)
log.info(f"Connected to a {DB.__class__.__name__} database.")

router = Router(DB, migrate_dir="apps/web/internal/migrations", logger=log)
router.run()

DB.close()
DB.connect(reuse_if_open=True)

# Define an aspect-oriented decorator to wrap database operation functions
def aspect_database_operations(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if not DB.is_closed():
            DB.close()
        DB.connect(reuse_if_open=True)
        try:
            # Execute the decorated database operation function
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            return e
    return wrapper
