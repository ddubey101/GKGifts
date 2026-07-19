"""Aura Commerce backend API tests (pytest).
Covers: health, auth (register/login/me), catalog (categories/banners/products/search),
cart, wishlist, addresses, coupons, checkout, orders, reviews, notifications, admin.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://scalable-marketplace-4.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@gkgifts.com"
DEMO_PASS = "Demo@123"
ADMIN_EMAIL = "admin@gkgifts.com"
ADMIN_PASS = "Admin@123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    assert r.status_code == 200, f"demo login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- health & auth ---------------------------------------------------

def test_health(session):
    r = session.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_register_and_login(session):
    email = f"test_{uuid.uuid4().hex[:8]}@aura.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "Pass@123", "name": "TEST User"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == email.lower()
    assert "password_hash" not in data["user"]

    # duplicate
    r2 = session.post(f"{API}/auth/register", json={"email": email, "password": "Pass@123", "name": "x"})
    assert r2.status_code == 400

    # login
    r3 = session.post(f"{API}/auth/login", json={"email": email, "password": "Pass@123"})
    assert r3.status_code == 200
    tok = r3.json()["token"]

    r4 = session.get(f"{API}/auth/me", headers=auth(tok))
    assert r4.status_code == 200
    assert r4.json()["email"] == email


def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_unauthorized(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- catalog ---------------------------------------------------------

def test_categories(session):
    r = session.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert isinstance(cats, list) and len(cats) >= 6
    assert all("category_id" in c and "name" in c for c in cats)


def test_banners(session):
    r = session.get(f"{API}/banners")
    assert r.status_code == 200
    assert len(r.json()) >= 3


def test_products_list_and_filter(session):
    r = session.get(f"{API}/products")
    assert r.status_code == 200
    products = r.json()
    assert len(products) >= 10
    pid = products[0]["product_id"]

    r2 = session.get(f"{API}/products", params={"category_id": "cat_electronics"})
    assert r2.status_code == 200
    assert all(p["category_id"] == "cat_electronics" for p in r2.json())

    r3 = session.get(f"{API}/products", params={"tag": "flash_sale"})
    assert r3.status_code == 200
    assert len(r3.json()) >= 1

    r4 = session.get(f"{API}/products", params={"q": "headphones"})
    assert r4.status_code == 200

    r5 = session.get(f"{API}/products/{pid}")
    assert r5.status_code == 200
    p = r5.json()
    assert p["product_id"] == pid and "reviews" in p

    r6 = session.get(f"{API}/products/prd_doesnotexist")
    assert r6.status_code == 404


def test_search_suggest(session):
    r = session.get(f"{API}/search/suggest", params={"q": "yog"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    r2 = session.get(f"{API}/search/suggest")
    assert r2.status_code == 200


# ---------- cart / wishlist / addresses ------------------------------------

def _first_product_id(session):
    return session.get(f"{API}/products").json()[0]["product_id"]


def test_cart_flow(session, demo_token):
    pid = _first_product_id(session)
    session.post(f"{API}/cart/clear", headers=auth(demo_token))

    r = session.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 2}, headers=auth(demo_token))
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    assert body["subtotal"] > 0
    assert body["total"] == round(body["subtotal"] + body["shipping"] + body["tax"], 2)

    # GET cart persistence
    r2 = session.get(f"{API}/cart", headers=auth(demo_token))
    assert r2.status_code == 200
    assert r2.json()["count"] == 2

    # update to 5
    r3 = session.post(f"{API}/cart/update", json={"product_id": pid, "quantity": 5}, headers=auth(demo_token))
    assert r3.status_code == 200
    assert r3.json()["count"] == 5

    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    r4 = session.get(f"{API}/cart", headers=auth(demo_token))
    assert r4.json()["count"] == 0


def test_wishlist_toggle(session, demo_token):
    pid = _first_product_id(session)
    r = session.post(f"{API}/wishlist/toggle", json={"product_id": pid}, headers=auth(demo_token))
    assert r.status_code == 200
    added_first = r.json()["added"]
    r2 = session.post(f"{API}/wishlist/toggle", json={"product_id": pid}, headers=auth(demo_token))
    assert r2.status_code == 200
    assert r2.json()["added"] != added_first
    r3 = session.get(f"{API}/wishlist", headers=auth(demo_token))
    assert r3.status_code == 200
    assert isinstance(r3.json(), list)


@pytest.fixture(scope="session")
def demo_address(session, demo_token):
    body = {
        "label": "TEST_Home",
        "full_name": "Demo Tester",
        "phone": "9999900000",
        "line1": "TEST 123 Test Street",
        "line2": "Flat 4",
        "city": "Bengaluru",
        "state": "KA",
        "pincode": "560001",
        "is_default": True,
    }
    r = session.post(f"{API}/addresses", json=body, headers=auth(demo_token))
    assert r.status_code == 200, r.text
    addr = r.json()
    assert addr["address_id"].startswith("addr_")
    yield addr
    session.delete(f"{API}/addresses/{addr['address_id']}", headers=auth(demo_token))


def test_addresses_list(session, demo_token, demo_address):
    r = session.get(f"{API}/addresses", headers=auth(demo_token))
    assert r.status_code == 200
    assert any(a["address_id"] == demo_address["address_id"] for a in r.json())


# ---------- coupons ---------------------------------------------------------

def test_coupons_list(session):
    r = session.get(f"{API}/coupons")
    assert r.status_code == 200
    codes = {c["code"] for c in r.json()}
    assert {"WELCOME10", "SAVE200", "AURA25"}.issubset(codes)


# ---------- checkout / orders / notifications ------------------------------

@pytest.fixture(scope="session")
def created_order(session, demo_token, demo_address):
    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    # add a product priced to exceed all coupon min_orders
    products = session.get(f"{API}/products").json()
    expensive = max(products, key=lambda p: p["price"])
    pid = expensive["product_id"]
    session.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 1}, headers=auth(demo_token))
    cart = session.get(f"{API}/cart", headers=auth(demo_token)).json()
    subtotal_before = cart["subtotal"]

    r = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod", "coupon_code": "WELCOME10"},
        headers=auth(demo_token),
    )
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["status"] == "confirmed"
    assert order["coupon_code"] == "WELCOME10"
    assert order["discount"] > 0
    assert order["subtotal"] == subtotal_before
    assert order["total"] == round(order["subtotal"] + order["shipping"] + order["tax"] - order["discount"], 2)
    assert len(order["timeline"]) >= 1
    return order


def test_order_detail_and_persistence(session, demo_token, created_order):
    oid = created_order["order_id"]
    r = session.get(f"{API}/orders/{oid}", headers=auth(demo_token))
    assert r.status_code == 200
    assert r.json()["order_id"] == oid

    r2 = session.get(f"{API}/orders", headers=auth(demo_token))
    assert r2.status_code == 200
    assert any(o["order_id"] == oid for o in r2.json())


def test_checkout_invalid_coupon_minorder(session, demo_token, demo_address):
    # cart is now empty after checkout - re-add cheap item
    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    products = session.get(f"{API}/products").json()
    cheap = min(products, key=lambda p: p["price"])
    session.post(f"{API}/cart/add", json={"product_id": cheap["product_id"], "quantity": 1}, headers=auth(demo_token))
    r = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod", "coupon_code": "AURA25"},
        headers=auth(demo_token),
    )
    assert r.status_code == 400  # min order not met
    # bad code
    r2 = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod", "coupon_code": "BOGUS"},
        headers=auth(demo_token),
    )
    assert r2.status_code == 400
    session.post(f"{API}/cart/clear", headers=auth(demo_token))


def test_empty_cart_checkout(session, demo_token, demo_address):
    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    r = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod"},
        headers=auth(demo_token),
    )
    assert r.status_code == 400


def test_notifications_flow(session, demo_token, created_order):
    r = session.get(f"{API}/notifications", headers=auth(demo_token))
    assert r.status_code == 200
    notifs = r.json()
    assert any("Order confirmed" in n["title"] for n in notifs)
    r2 = session.post(f"{API}/notifications/read-all", headers=auth(demo_token))
    assert r2.status_code == 200
    r3 = session.get(f"{API}/notifications", headers=auth(demo_token))
    assert all(n["read"] for n in r3.json())


def test_order_cancel(session, demo_token, demo_address):
    # place fresh order
    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    products = session.get(f"{API}/products").json()
    pid = products[0]["product_id"]
    session.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 1}, headers=auth(demo_token))
    r = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod"},
        headers=auth(demo_token),
    )
    assert r.status_code == 200
    oid = r.json()["order_id"]
    r2 = session.post(f"{API}/orders/{oid}/cancel", headers=auth(demo_token))
    assert r2.status_code == 200
    r3 = session.get(f"{API}/orders/{oid}", headers=auth(demo_token))
    assert r3.json()["status"] == "cancelled"


# ---------- reviews ---------------------------------------------------------

def test_add_review_updates_rating(session, demo_token):
    pid = _first_product_id(session)
    r = session.post(
        f"{API}/reviews",
        json={"product_id": pid, "rating": 5, "title": "TEST great", "body": "Loved it"},
        headers=auth(demo_token),
    )
    assert r.status_code == 200
    after = session.get(f"{API}/products/{pid}").json()
    # backend recomputes rating/review_count from the reviews collection
    assert any(rv.get("title") == "TEST great" for rv in after["reviews"])
    assert after["review_count"] >= 1
    assert 1 <= after["rating"] <= 5


# ---------- admin -----------------------------------------------------------

def test_admin_stats(session, admin_token):
    r = session.get(f"{API}/admin/stats", headers=auth(admin_token))
    assert r.status_code == 200
    s = r.json()
    for k in ("revenue", "orders", "users", "products", "low_stock", "top_products", "recent_orders"):
        assert k in s


def test_admin_role_guard(session, demo_token):
    r = session.get(f"{API}/admin/stats", headers=auth(demo_token))
    assert r.status_code == 403


def test_admin_status_advance(session, admin_token, demo_token, demo_address):
    # create order to advance
    session.post(f"{API}/cart/clear", headers=auth(demo_token))
    pid = _first_product_id(session)
    session.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 1}, headers=auth(demo_token))
    o = session.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod"},
        headers=auth(demo_token),
    ).json()
    oid = o["order_id"]

    for status in ("packed", "shipped", "out_for_delivery", "delivered"):
        r = session.post(f"{API}/admin/orders/{oid}/status", json={"status": status}, headers=auth(admin_token))
        assert r.status_code == 200, f"advance to {status} failed: {r.text}"

    detail = session.get(f"{API}/orders/{oid}", headers=auth(demo_token)).json()
    assert detail["status"] == "delivered"
    assert len(detail["timeline"]) >= 5

    # invalid status
    r_bad = session.post(f"{API}/admin/orders/{oid}/status", json={"status": "banana"}, headers=auth(admin_token))
    assert r_bad.status_code == 400
