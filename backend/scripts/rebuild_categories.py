"""Rebuild category taxonomy to match the real GK Gifts catalog and
remap every existing product to its new category.

- Wipes db.categories and inserts the 5 curated new categories.
- Remaps all 19 products by name.
- Also updates any banner links that pointed to the old categories.
- Idempotent — safe to re-run.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

BASE = "https://scalable-marketplace-4.preview.emergentagent.com"
NEW_CATEGORIES = [
    {"category_id": "cat_kids_bags", "name": "Kids Bags", "icon": "bag-handle", "order": 1,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/qbxt1hcgjIRN6nV._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_kids_dining", "name": "Kids Dining", "icon": "restaurant", "order": 2,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/Fbxt1xQIV0D4tLx._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_kids_room", "name": "Kids Room", "icon": "happy", "order": 3,
     "image": f"{BASE}/api/images/IMG_6410.JPG"},
    {"category_id": "cat_drinkware", "name": "Drinkware", "icon": "cafe", "order": 4,
     "image": f"{BASE}/api/images/IMG_6437.PNG"},
    {"category_id": "cat_gifts", "name": "Gifts & Utility", "icon": "gift", "order": 5,
     "image": f"{BASE}/api/images/legacy_b.jpg"},
]

# Product name (lowercased, exact) -> new category id
PRODUCT_TO_CAT = {
    # kids bags
    "kids 3d pink cat hard-shell cabin trolley bag": "cat_kids_bags",
    "unicorn magic drawstring bag": "cat_kids_bags",
    "kids hard-shell backpack": "cat_kids_bags",
    "racing car school backpack 18\"": "cat_kids_bags",
    "kids travel trolley bag": "cat_kids_bags",
    # kids dining
    "peppa pig cutlery set": "cat_kids_dining",
    "unicorn kids cutlery set": "cat_kids_dining",
    "stackable bento lunch box": "cat_kids_dining",
    "lunch box + water bottle combo": "cat_kids_dining",
    "leakproof stainless steel lunch box": "cat_kids_dining",
    "kids bamboo dinner plate": "cat_kids_dining",
    # kids room
    "stitch beach alarm clock": "cat_kids_room",
    "police car toy storage box": "cat_kids_room",
    "sparkly star hair clips set": "cat_kids_room",
    # drinkware
    "insulated travel tumbler": "cat_drinkware",
    "glass tumbler with leather sleeve": "cat_drinkware",
    # gifts & utility
    "usb rechargeable arc lighter": "cat_gifts",
    "rustic leather card holder": "cat_gifts",
    "drawstring utility pouch": "cat_gifts",
}


def main():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. wipe & reseed categories
    db.categories.delete_many({})
    db.categories.insert_many([dict(c) for c in NEW_CATEGORIES])
    print(f"categories: inserted {len(NEW_CATEGORIES)}")

    # 2. remap all products
    remapped = orphaned = 0
    for p in db.products.find({}, {"_id": 0, "product_id": 1, "name": 1, "category_id": 1}):
        target = PRODUCT_TO_CAT.get(p["name"].strip().lower())
        if not target:
            orphaned += 1
            print(f"  ⚠ no mapping for: {p['name']} (currently {p['category_id']})")
            continue
        if p.get("category_id") == target:
            continue
        db.products.update_one(
            {"product_id": p["product_id"]},
            {"$set": {"category_id": target}},
        )
        remapped += 1
    print(f"products: remapped={remapped}, orphaned={orphaned}")

    # 3. fix banner "link" fields that still point to obsolete categories
    valid_cats = {c["category_id"] for c in NEW_CATEGORIES}
    fallback = "cat_kids_bags"
    banner_fixes = 0
    for b in db.banners.find({}, {"_id": 0, "banner_id": 1, "link": 1}):
        if b.get("link") not in valid_cats:
            db.banners.update_one({"banner_id": b["banner_id"]}, {"$set": {"link": fallback}})
            banner_fixes += 1
    print(f"banners: fixed {banner_fixes}")

    print("\nDone.")


if __name__ == "__main__":
    main()
