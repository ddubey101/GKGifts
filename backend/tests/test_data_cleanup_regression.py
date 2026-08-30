"""Regression tests after local Mongo dupe cleanup + admin upload endpoint.

Scenarios (per review request):
  1. GET /api/products returns exactly 19; no deleted dupe names; renamed
     real-store variants present.
  2. GET /api/categories returns 8 (5 real + 3 price bands).
  3. Price-band filters cat_under_200 (3) and cat_under_50 (0).
  4. GET /api/banners returns 3, images on R2 pub host or m.media-amazon.com;
     none on preview.emergentagent.com.
  5. Auth + cart smoke: login demo -> empty cart -> add -> line_total.
  6. POST /api/admin/upload-image: 401 unauth, 200 admin with tiny PNG,
     returned url on R2 pub host under /products/.
"""
import io
import os
import struct
import zlib

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@gkgifts.com"
DEMO_PASS = "Demo@123"
ADMIN_EMAIL = "admin@gkgifts.com"
ADMIN_PASS = "Admin@123"

R2_PUBLIC_HOST = "pub-fe940a8553ae4773a90ce6b556da5d88.r2.dev"
AMAZON_HOST = "m.media-amazon.com"
BAD_PREVIEW_HOST = "scalable-marketplace-4.preview.emergentagent.com"


# ---------- fixtures --------------------------------------------------------


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def demo_token(s):
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    assert r.status_code == 200, f"demo login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


# ---------- 1. products -----------------------------------------------------


def test_products_count_and_dupe_cleanup(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    assert isinstance(products, list)
    assert len(products) == 19, f"expected 19 products after dupe cleanup, got {len(products)}"

    names = {p["name"] for p in products}

    # Deleted dupes must NOT appear
    assert "Peppa Pig Kids Cutlery Set" not in names, "deleted dupe still present"
    assert "3D Cat Kids Travel Luggage" not in names, "deleted dupe still present"

    # Renamed real-store variants must be present, with correct prices
    cutlery = next((p for p in products if p["name"] == "Peppa Pig Cutlery Set"), None)
    assert cutlery is not None, "Peppa Pig Cutlery Set missing"
    assert cutlery["price"] == 150, f"cutlery price {cutlery['price']} != 150"

    trolley = next(
        (p for p in products if p["name"] == "Kids 3D Pink Cat Hard-Shell Cabin Trolley Bag"),
        None,
    )
    assert trolley is not None, "Kids 3D Pink Cat Hard-Shell Cabin Trolley Bag missing"
    assert trolley["price"] == 1350, f"trolley price {trolley['price']} != 1350"


# ---------- 2. categories ---------------------------------------------------


def test_categories_shape(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list)
    assert len(cats) == 8, f"expected 8 categories, got {len(cats)}: {[c.get('name') for c in cats]}"

    ids = {c["category_id"] for c in cats}
    names = {c["name"] for c in cats}

    # The 3 price-band virtual categories
    for cid in ("cat_under_50", "cat_under_100", "cat_under_200"):
        assert cid in ids, f"missing price-band category {cid}"

    # 5 real categories (names per review request)
    expected_real = {"Kids Bags", "Kids Dining", "Kids Room", "Drinkware", "Gifts & Utility"}
    missing_real = expected_real - names
    assert not missing_real, f"missing real categories: {missing_real}"


# ---------- 3. price-band filters -------------------------------------------


def test_price_band_under_200_returns_expected_three(s):
    r = s.get(f"{API}/products", params={"category_id": "cat_under_200"})
    assert r.status_code == 200
    prods = r.json()
    assert isinstance(prods, list)
    assert len(prods) == 3, f"expected 3 products under 200, got {len(prods)}: {[p['name'] for p in prods]}"

    by_name = {p["name"]: p for p in prods}
    # Peppa Pig Cutlery Set @150
    assert "Peppa Pig Cutlery Set" in by_name
    assert by_name["Peppa Pig Cutlery Set"]["price"] == 150
    # Unicorn Kids Cutlery @150
    unicorn = next((n for n in by_name if "Unicorn" in n and "Cutlery" in n), None)
    assert unicorn is not None, f"missing Unicorn Cutlery product; got {list(by_name)}"
    assert by_name[unicorn]["price"] == 150
    # Drawstring Utility Pouch @120
    pouch = next((n for n in by_name if "Drawstring" in n), None)
    assert pouch is not None, f"missing Drawstring pouch; got {list(by_name)}"
    assert by_name[pouch]["price"] == 120

    # All prices strictly under 200
    for p in prods:
        assert p["price"] < 200


def test_price_band_under_50_returns_empty(s):
    r = s.get(f"{API}/products", params={"category_id": "cat_under_50"})
    assert r.status_code == 200
    prods = r.json()
    assert prods == [], f"expected empty list for cat_under_50, got {len(prods)}"


# ---------- 4. banners ------------------------------------------------------


def test_banners_count_and_hosts(s):
    r = s.get(f"{API}/banners")
    assert r.status_code == 200
    banners = r.json()
    assert isinstance(banners, list)
    assert len(banners) == 3, f"expected 3 banners, got {len(banners)}"

    for b in banners:
        img = b.get("image_url") or b.get("image") or ""
        assert img, f"banner missing image url: {b}"
        assert BAD_PREVIEW_HOST not in img, f"banner still points at preview host: {img}"
        assert (R2_PUBLIC_HOST in img) or (AMAZON_HOST in img), (
            f"banner image on unexpected host: {img}"
        )


# ---------- 5. auth + cart smoke -------------------------------------------


def _clear_cart(s, token):
    s.post(f"{API}/cart/clear", headers=_auth(token))


def test_auth_and_cart_smoke(s, demo_token):
    _clear_cart(s, demo_token)

    r = s.get(f"{API}/cart", headers=_auth(demo_token))
    assert r.status_code == 200
    cart = r.json()
    assert cart["items"] == []
    assert cart["subtotal"] == 0
    assert cart["count"] == 0

    # Pick a valid product from the 19
    products = s.get(f"{API}/products").json()
    pid = products[0]["product_id"]
    price = products[0]["price"]

    r = s.post(
        f"{API}/cart/add",
        json={"product_id": pid, "quantity": 1},
        headers=_auth(demo_token),
    )
    assert r.status_code == 200, r.text

    cart = s.get(f"{API}/cart", headers=_auth(demo_token)).json()
    assert cart["count"] == 1
    assert len(cart["items"]) == 1
    line = cart["items"][0]
    assert line["product_id"] == pid
    assert line["quantity"] == 1
    assert line["line_total"] == round(price * 1, 2)

    _clear_cart(s, demo_token)


# ---------- 6. admin upload endpoint ---------------------------------------


def _tiny_png_bytes() -> bytes:
    """Build a valid 1x1 red PNG in-memory (no PIL required)."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"  # filter byte + RGB pixel (red)
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


def test_admin_upload_unauth_returns_401(s):
    png = _tiny_png_bytes()
    # Use a fresh session so we don't carry Content-Type json header
    r = requests.post(
        f"{API}/admin/upload-image",
        files={"file": ("test.png", io.BytesIO(png), "image/png")},
    )
    assert r.status_code in (401, 403), f"expected 401/403 without auth, got {r.status_code} {r.text}"


def test_admin_upload_authed_returns_r2_url(admin_token):
    png = _tiny_png_bytes()
    r = requests.post(
        f"{API}/admin/upload-image",
        files={"file": ("test.png", io.BytesIO(png), "image/png")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200, f"admin upload failed: {r.status_code} {r.text}"
    body = r.json()
    assert "url" in body, f"missing url in response: {body}"
    url = body["url"]
    expected_prefix = f"https://{R2_PUBLIC_HOST}/products/"
    assert url.startswith(expected_prefix), (
        f"url does not start with {expected_prefix}: {url}"
    )
