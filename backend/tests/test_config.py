import sys
from pathlib import Path

# Add project root directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings

print("[OK] Config loaded successfully!")
print(f"App Environment: {settings.APP_ENV}")
print(f"Primary LLM: {settings.PRIMARY_LLM_PROVIDER}")
print(f"Vector DB Collection: {settings.QDRANT_COLLECTION_NAME}")