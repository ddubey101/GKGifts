"""Sync catalog with gkgifts.store bestsellers.

- Updates the existing "3D Cat Kids Travel Luggage" and "Peppa Pig Kids Cutlery Set"
  to match the real store name / MRP / price and add the new Drive image.
- Adds any bestsellers from https://www.gkgifts.store/ that aren't already listed.

Idempotent: matches existing products by (case-insensitive) name.
"""
import os, requests

BASE = "http://localhost:8001/api"
ADMIN_EMAIL = "admin@gkgifts.com"
ADMIN_PASS = "Admin@123"

IMAGE_BASE = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://scalable-marketplace-4.preview.emergentagent.com",
).rstrip("/") + "/api/images"

# Category mapping to existing seeded categories
CAT_HOME = "cat_home"        # kitchen / lunch / plates / lighter go here
CAT_FASHION = "cat_fashion"  # bags / trolleys / backpacks / pouches
CAT_BEAUTY = "cat_beauty"

# Products pulled from https://www.gkgifts.store/
# name is the canonical store name; if a listing already exists with a *close*
# match, we PATCH it to the store's real MRP / price / images.
CATALOG = [
    # ---- Existing listings that need to be REALIGNED with the real store ----
    {
        "match": "3D Cat Kids Travel Luggage",  # existing (old AI-guessed name)
        "name": "Kids 3D Pink Cat Hard-Shell Cabin Trolley Bag",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "price": 1350, "mrp": 2300, "stock": 22,
        "tags": ["featured", "top", "trending"],
        "description": "Hard-shell cabin-size trolley bag with a 3D pink cat design and 4 silent-spinner wheels. Perfect first suitcase for kids — light, tough, and irresistibly cute.",
        "images": [
            f"{IMAGE_BASE}/pink_cat_trolley.png",
            "https://m.media-amazon.com/images/X/bxt1/M/qbxt1hcgjIRN6nV._SL360_QL95_FMwebp_.png",
            f"{IMAGE_BASE}/IMG_6414.PNG",
        ],
    },
    {
        "match": "Peppa Pig Kids Cutlery Set",
        "name": "Peppa Pig Cutlery Set",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "price": 150, "mrp": 450, "stock": 80,
        "tags": ["featured", "deal", "top"],
        "description": "4-piece stainless-steel + food-safe plastic cutlery set with cheerful Peppa Pig character handles. 66% off.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/Fbxt1xQIV0D4tLx._SL360_QL95_FMwebp_.png",
            f"{IMAGE_BASE}/IMG_6411.PNG",
        ],
    },
    # ---- New listings straight from the store ----
    {
        "name": "Drawstring Utility Pouch",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "price": 120, "mrp": 300, "stock": 150,
        "tags": ["deal", "trending"],
        "description": "Soft canvas drawstring pouch — the everyday utility bag for keys, chargers, or gift wrapping. 60% off.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/mbxt1ROoVacvMOJ._SL360_QL95_FMwebp_.jpg",
        ],
    },
    {
        "name": "Kids Bamboo Dinner Plate",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "price": 450, "mrp": 700, "stock": 60,
        "tags": ["featured", "new"],
        "description": "Sustainable bamboo dinner plate with a soft-grip base. BPA-free, dishwasher friendly. Perfect for toddlers.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/hbxt1xNGKgKSr2R._SL360_QL95_FMwebp_.jpg",
        ],
    },
    {
        "name": "Kids Hard-Shell Backpack",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "price": 550, "mrp": 950, "stock": 45,
        "tags": ["deal", "trending"],
        "description": "Ultra-light hard-shell backpack that shrugs off spills and scrapes. Adjustable straps, front zip pocket.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/hbxt1xRp0tTxhXD._SL360_QL95_FMwebp_.jpg",
        ],
    },
    {
        "name": "Racing Car School Backpack 18\"",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "price": 1100, "mrp": 1649, "stock": 35,
        "tags": ["new", "featured"],
        "description": "Premium 18-inch school backpack with a bold blue racing-car print. Padded back, water-resistant fabric, laptop sleeve.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/abxt1xnRo5ASerY._SL360_QL95_FMwebp_.jpg",
        ],
    },
    {
        "name": "Unicorn Kids Cutlery Set",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "price": 150, "mrp": 350, "stock": 100,
        "tags": ["deal", "trending", "top"],
        "description": "Magical unicorn-themed 4-piece cutlery set. Stainless-steel heads with soft-grip pastel handles.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/9bxt1BL90xaIGYa._SL360_QL95_FMwebp_.png",
        ],
    },
    {
        "name": "Kids Travel Trolley Bag",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "price": 1250, "mrp": 1999, "stock": 28,
        "tags": ["featured"],
        "description": "Sturdy kids trolley with retractable handle and 360° wheels. Cabin-size, colourful, endlessly fun.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/7bxt1R7VVayvqrL._QL85_FMwebp_.png",
        ],
    },
    {
        "name": "Leakproof Stainless Steel Lunch Box",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "price": 649, "mrp": 999, "stock": 70,
        "tags": ["deal", "new"],
        "description": "Insulated stainless-steel lunch box with a silicone leakproof seal. Keeps meals warm for 4+ hours.",
        "images": [
            "https://m.media-amazon.com/images/X/bxt1/M/xbxt1RQNmccXKCP._QL85_FMwebp_.png",
        ],
    },
]


def _norm(s: str) -> str:
    return s.strip().lower()


def main():
    tok = requests.post(
        f"{BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=10,
    ).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}

    existing = requests.get(f"{BASE}/admin/products?limit=500", headers=h, timeout=10).json()
    by_name = {_norm(p["name"]): p for p in existing}

    updated = created = 0
    for item in CATALOG:
        match_name = item.get("match", item["name"])
        prod = by_name.get(_norm(match_name)) or by_name.get(_norm(item["name"]))
        payload = {k: v for k, v in item.items() if k != "match"}
        if prod:
            r = requests.patch(
                f"{BASE}/admin/products/{prod['product_id']}",
                json=payload, headers=h, timeout=10,
            )
            if r.status_code < 300:
                updated += 1
                print(f"updated: {prod['name']!r} -> {item['name']!r}")
            else:
                print(f"UPDATE FAIL {item['name']}: {r.status_code} {r.text[:180]}")
        else:
            r = requests.post(
                f"{BASE}/admin/products",
                json={**payload, "variants": []}, headers=h, timeout=10,
            )
            if r.status_code < 300:
                created += 1
                print(f"created: {item['name']}")
            else:
                print(f"CREATE FAIL {item['name']}: {r.status_code} {r.text[:180]}")

    print(f"\nDone. created={created} updated={updated} target={len(CATALOG)}")


if __name__ == "__main__":
    main()
