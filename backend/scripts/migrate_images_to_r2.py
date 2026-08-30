"""One-shot: migrate product / category / banner images from local
FastAPI static folder (/api/images/*) to Cloudflare R2.

- Uploads every file in backend/static/products/ to R2 under products/<name>.
- Rewrites every product.images[] / category.image / banner.image URL that
  points at /api/images/<file> to the new R2 public URL.
- Idempotent: re-uploading the same key just overwrites; DB URLs already
  pointing at R2 are left alone.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent
sys.path.insert(0, str(BACKEND))
load_dotenv(BACKEND / ".env", override=True)

from pymongo import MongoClient  # noqa: E402
from r2_storage import is_configured, upload_bytes, R2_PUBLIC_URL  # noqa: E402

if not is_configured():
    print("R2 env not configured — check backend/.env")
    sys.exit(1)

STATIC_DIR = BACKEND / "static" / "products"
FILES = sorted(p for p in STATIC_DIR.iterdir() if p.is_file())
print(f"Found {len(FILES)} local images in {STATIC_DIR}\n")

# 1. Upload every file. Keep the filename so the mapping is human-readable.
old_to_new: dict[str, str] = {}   # /api/images/<filename>  ->  R2 public URL
for p in FILES:
    key = f"products/{p.name}"
    with p.open("rb") as f:
        data = f.read()
    url = upload_bytes(data, key)
    old_marker = f"/api/images/{p.name}"
    old_to_new[old_marker] = url
    print(f"  ✓ {p.name} ({len(data) // 1024} KB) -> {url}")

print()

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def rewrite(url: str | None) -> str | None:
    """Swap a legacy /api/images/<file> URL for its R2 equivalent, else pass through."""
    if not url:
        return url
    if url.startswith(R2_PUBLIC_URL()):
        return url  # already migrated
    for marker, new in old_to_new.items():
        if marker in url:
            return new
    return url


# 2. Products
prod_updated = 0
for p in db.products.find({}, {"_id": 0, "product_id": 1, "images": 1}):
    old = p.get("images") or []
    new = [rewrite(u) for u in old]
    if new != old:
        db.products.update_one({"product_id": p["product_id"]}, {"$set": {"images": new}})
        prod_updated += 1
print(f"products: {prod_updated} rewritten")

# 3. Categories
cat_updated = 0
for c in db.categories.find({}, {"_id": 0, "category_id": 1, "image": 1}):
    new = rewrite(c.get("image"))
    if new and new != c.get("image"):
        db.categories.update_one({"category_id": c["category_id"]}, {"$set": {"image": new}})
        cat_updated += 1
print(f"categories: {cat_updated} rewritten")

# 4. Banners
ban_updated = 0
for b in db.banners.find({}, {"_id": 0, "banner_id": 1, "image": 1}):
    new = rewrite(b.get("image"))
    if new and new != b.get("image"):
        db.banners.update_one({"banner_id": b["banner_id"]}, {"$set": {"image": new}})
        ban_updated += 1
print(f"banners: {ban_updated} rewritten")

print("\nDone.")
