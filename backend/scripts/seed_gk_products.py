"""One-shot: seed real Gk Gifts products from the imported Drive images.
Idempotent — skips a product if a listing with the same name already exists.
"""
import os
import sys
import requests

BASE = "http://localhost:8001/api"
ADMIN_EMAIL = "admin@gkgifts.com"
ADMIN_PASS = "Admin@123"

# category ids that already exist in the app
CAT_HOME = "cat_home"
CAT_FASHION = "cat_fashion"
CAT_BEAUTY = "cat_beauty"

# Public URL used by the mobile client to reach static images.
# Falls back to localhost if EXPO_PUBLIC_BACKEND_URL isn't set on this machine.
IMAGE_BASE = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://scalable-marketplace-4.preview.emergentagent.com",
).rstrip("/") + "/api/images"

PRODUCTS = [
    {
        "name": "Stitch Beach Alarm Clock",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6410.JPG",
        "price": 599, "mrp": 999, "stock": 45,
        "tags": ["new", "featured", "trending"],
        "description": "Cheerful desk alarm clock featuring Stitch on a beach vacation. Perfect for a kid's room or a playful desk. Battery-operated.",
    },
    {
        "name": "Peppa Pig Kids Cutlery Set",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6411.PNG",
        "price": 499, "mrp": 799, "stock": 80,
        "tags": ["featured", "deal"],
        "description": "Cheerful stainless steel + food-safe plastic cutlery set with Peppa Pig character handles. Includes 2 spoons and 2 forks.",
    },
    {
        "name": "3D Cat Kids Travel Luggage",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "image": "IMG_6414.PNG",
        "price": 3499, "mrp": 4999, "stock": 22,
        "tags": ["featured", "top"],
        "description": "Adorable 3D cat trolley suitcase with silent 360° wheels. Cabin-size, TSA lock. Turns airport waits into a play zone.",
    },
    {
        "name": "Police Car Toy Storage Box",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6417.PNG",
        "price": 1199, "mrp": 1799, "stock": 30,
        "tags": ["new", "trending"],
        "description": "Foldable fabric toy chest shaped like a police car. Turns cleanup into playtime. Holds up to 40 L of toys.",
    },
    {
        "name": "Insulated Travel Tumbler",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6437.PNG",
        "price": 1199, "mrp": 1799, "stock": 55,
        "tags": ["deal", "trending"],
        "description": "Double-wall vacuum tumbler that keeps drinks cold for 24h and hot for 12h. Sleek matte finish, spill-proof lid.",
    },
    {
        "name": "Stackable Bento Lunch Box",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6505.PNG",
        "price": 599, "mrp": 999, "stock": 90,
        "tags": ["new", "featured"],
        "description": "Two-tier stackable bento with leak-proof seal and matching cutlery. Microwave and dishwasher safe.",
    },
    {
        "name": "Unicorn Magic Drawstring Bag",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "image": "IMG_6612.PNG",
        "price": 399, "mrp": 599, "stock": 120,
        "tags": ["featured", "trending", "new"],
        "description": "Soft canvas drawstring bag with a hand-illustrated unicorn print. Perfect for school, sleepovers, and gifting.",
    },
    {
        "name": "USB Rechargeable Arc Lighter",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6613.PNG",
        "price": 499, "mrp": 899, "stock": 60,
        "tags": ["deal"],
        "description": "Windproof electric arc lighter with a flexible neck. USB-C rechargeable — one charge lasts up to 300 lights.",
    },
    {
        "name": "Lunch Box + Water Bottle Combo",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "IMG_6643.PNG",
        "price": 599, "mrp": 999, "stock": 75,
        "tags": ["deal", "top"],
        "description": "Insulated stainless steel lunch box paired with a matching 500 ml water bottle. Comes gift-boxed.",
    },
    {
        "name": "Sparkly Star Hair Clips Set",
        "brand": "GK Gifts",
        "category_id": CAT_BEAUTY,
        "image": "IMG_6646.PNG",
        "price": 349, "mrp": 599, "stock": 200,
        "tags": ["new", "trending", "top"],
        "description": "Set of 6 sparkling star and bow hair clips. Anti-slip alligator base, soft on hair.",
    },
    {
        "name": "Glass Tumbler with Leather Sleeve",
        "brand": "GK Gifts",
        "category_id": CAT_HOME,
        "image": "legacy_a.jpg",
        "price": 449, "mrp": 799, "stock": 65,
        "tags": ["featured"],
        "description": "450 ml borosilicate glass tumbler wrapped in a hand-stitched vegan-leather sleeve. Fits most car cup holders.",
    },
    {
        "name": "Rustic Leather Card Holder",
        "brand": "GK Gifts",
        "category_id": CAT_FASHION,
        "image": "legacy_b.jpg",
        "price": 1199, "mrp": 1999, "stock": 40,
        "tags": ["featured", "top"],
        "description": "Handcrafted full-grain leather card holder with contrast stitching. Holds up to 8 cards + folded notes.",
    },
]

def main():
    r = requests.post(
        f"{BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=10,
    )
    r.raise_for_status()
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}

    existing = requests.get(f"{BASE}/admin/products?limit=500", headers=h, timeout=10).json()
    existing_names = {p["name"].strip().lower() for p in existing}

    created, skipped = 0, 0
    for p in PRODUCTS:
        if p["name"].strip().lower() in existing_names:
            skipped += 1
            print(f"skip (exists): {p['name']}")
            continue
        payload = {
            "name": p["name"],
            "brand": p["brand"],
            "category_id": p["category_id"],
            "description": p["description"],
            "price": p["price"],
            "mrp": p["mrp"],
            "stock": p["stock"],
            "images": [f"{IMAGE_BASE}/{p['image']}"],
            "tags": p["tags"],
            "variants": [],
        }
        cr = requests.post(f"{BASE}/admin/products", json=payload, headers=h, timeout=10)
        if cr.status_code >= 300:
            print(f"fail {p['name']}: {cr.status_code} {cr.text[:200]}")
            continue
        created += 1
        print(f"created: {p['name']} -> {cr.json().get('product_id')}")

    print(f"\nDone. created={created}, skipped={skipped}, total_target={len(PRODUCTS)}")

if __name__ == "__main__":
    main()
