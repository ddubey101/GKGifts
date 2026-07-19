"""Regression tests for the N+1 optimization refactor in server.py.

Focus areas per review request:
  1. _hydrate_cart (empty + populated) returns correct shape and product embed.
  2. cart/add and cart/update return hydrated shape with correct totals.
  3. checkout: creates order, clears cart, decrements stock (bulk), pushes notif.
  4. admin/stats projection: all required keys present, recent_orders keeps items[].
  5. Multi-item cart (3 different products) checkout -> stock all decremented.
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@gkgifts.com"
DEMO_PASS = "Demo@123"
ADMIN_EMAIL = "admin@gkgifts.com"
ADMIN_PASS = "Admin@123"


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


@pytest.fixture(scope="module")
def demo_address(s, demo_token):
    body = {
        "label": "TEST_N1_Home",
        "full_name": "Regression Tester",
        "phone": "9999911111",
        "line1": "TEST N1 Street",
        "line2": "Flat 9",
        "city": "Bengaluru",
        "state": "KA",
        "pincode": "560001",
        "is_default": True,
    }
    r = s.post(f"{API}/addresses", json=body, headers=_auth(demo_token))
    assert r.status_code == 200, r.text
    addr = r.json()
    yield addr
    s.delete(f"{API}/addresses/{addr['address_id']}", headers=_auth(demo_token))


def _all_products(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    return r.json()


def _get_stock(s, pid):
    r = s.get(f"{API}/products/{pid}")
    assert r.status_code == 200
    return r.json()["stock"]


HYDRATED_KEYS = {"items", "subtotal", "shipping", "tax", "total", "count"}


def _assert_hydrated_shape(body: dict):
    assert HYDRATED_KEYS.issubset(body.keys()), f"missing keys: {HYDRATED_KEYS - set(body.keys())}"
    assert isinstance(body["items"], list)
    assert isinstance(body["subtotal"], (int, float))
    assert isinstance(body["tax"], (int, float))
    assert isinstance(body["total"], (int, float))
    assert isinstance(body["count"], int)


# ---------- 1. empty cart hydration -----------------------------------------

def test_empty_cart_hydration(s, demo_token):
    s.post(f"{API}/cart/clear", headers=_auth(demo_token))
    r = s.get(f"{API}/cart", headers=_auth(demo_token))
    assert r.status_code == 200
    body = r.json()
    _assert_hydrated_shape(body)
    assert body["items"] == []
    assert body["subtotal"] == 0.0
    assert body["shipping"] == 0
    assert body["tax"] == 0.0
    assert body["total"] == 0.0
    assert body["count"] == 0


# ---------- 2. cart/add and cart/update hydrated shape ---------------------

def test_cart_add_hydrated_shape_and_totals(s, demo_token):
    products = _all_products(s)
    pid = products[0]["product_id"]
    price = products[0]["price"]

    s.post(f"{API}/cart/clear", headers=_auth(demo_token))
    r = s.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 2}, headers=_auth(demo_token))
    assert r.status_code == 200
    body = r.json()
    _assert_hydrated_shape(body)

    assert body["count"] == 2
    assert len(body["items"]) == 1
    line = body["items"][0]
    # product batch-fetch must populate the full product object
    assert "product" in line and line["product"]["product_id"] == pid
    assert line["product"]["price"] == price
    assert line["quantity"] == 2
    assert line["line_total"] == round(price * 2, 2)

    # totals math
    expected_subtotal = round(price * 2, 2)
    assert body["subtotal"] == expected_subtotal
    expected_tax = round(expected_subtotal * 0.05, 2)
    assert body["tax"] == expected_tax
    expected_ship = 0 if expected_subtotal >= 499 else 49
    assert body["shipping"] == expected_ship
    assert body["total"] == round(expected_subtotal + expected_ship + expected_tax, 2)

    # update to 5
    r2 = s.post(f"{API}/cart/update", json={"product_id": pid, "quantity": 5}, headers=_auth(demo_token))
    assert r2.status_code == 200
    body2 = r2.json()
    _assert_hydrated_shape(body2)
    assert body2["count"] == 5
    assert body2["items"][0]["product"]["product_id"] == pid
    exp_sub2 = round(price * 5, 2)
    assert body2["subtotal"] == exp_sub2

    s.post(f"{API}/cart/clear", headers=_auth(demo_token))


# ---------- 3. checkout: order, clear, stock, notification ------------------

def test_checkout_creates_order_clears_cart_decrements_stock_notifies(s, demo_token, demo_address):
    products = _all_products(s)
    # pick a product with stock and price > 0
    p = next(x for x in products if x["stock"] > 5)
    pid = p["product_id"]
    stock_before = _get_stock(s, pid)

    s.post(f"{API}/cart/clear", headers=_auth(demo_token))
    s.post(f"{API}/cart/add", json={"product_id": pid, "quantity": 2}, headers=_auth(demo_token))

    r = s.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod"},
        headers=_auth(demo_token),
    )
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["status"] == "confirmed"
    assert len(order["items"]) == 1
    assert order["items"][0]["product_id"] == pid
    assert order["items"][0]["quantity"] == 2

    # cart is cleared
    cart_after = s.get(f"{API}/cart", headers=_auth(demo_token)).json()
    assert cart_after["count"] == 0

    # stock decremented by exact quantity
    stock_after = _get_stock(s, pid)
    assert stock_after == stock_before - 2, f"stock: before={stock_before} after={stock_after}"

    # notification created
    notifs = s.get(f"{API}/notifications", headers=_auth(demo_token)).json()
    assert any("Order confirmed" in n["title"] for n in notifs)


# ---------- 4. admin/stats projection ---------------------------------------

def test_admin_stats_all_keys_present_and_items_in_recent_orders(s, admin_token):
    r = s.get(f"{API}/admin/stats", headers=_auth(admin_token))
    assert r.status_code == 200
    stats = r.json()

    required = {"revenue", "orders", "users", "products", "low_stock", "top_products", "recent_orders"}
    missing = required - set(stats.keys())
    assert not missing, f"admin/stats missing keys: {missing}"

    assert isinstance(stats["revenue"], (int, float))
    assert isinstance(stats["orders"], int)
    assert isinstance(stats["users"], int)
    assert isinstance(stats["products"], int)
    assert isinstance(stats["low_stock"], int)
    assert isinstance(stats["top_products"], list)
    assert isinstance(stats["recent_orders"], list)

    # projection must still include items[] on recent_orders
    if stats["recent_orders"]:
        for o in stats["recent_orders"]:
            assert "order_id" in o, "order_id missing after projection"
            assert "total" in o, "total missing after projection"
            assert "status" in o, "status missing after projection"
            assert "items" in o, "items[] missing on recent order after projection"
            assert isinstance(o["items"], list)


# ---------- 5. multi-item cart end-to-end -----------------------------------

def test_multi_item_cart_checkout_decrements_all_stocks(s, demo_token, demo_address):
    products = [p for p in _all_products(s) if p["stock"] > 3]
    assert len(products) >= 3, "need at least 3 products with stock > 3"
    picks = products[:3]
    pids = [p["product_id"] for p in picks]
    qty = [1, 2, 3]
    before = {pid: _get_stock(s, pid) for pid in pids}

    s.post(f"{API}/cart/clear", headers=_auth(demo_token))
    for pid, q in zip(pids, qty):
        rr = s.post(f"{API}/cart/add", json={"product_id": pid, "quantity": q}, headers=_auth(demo_token))
        assert rr.status_code == 200
        body = rr.json()
        _assert_hydrated_shape(body)
        # every item.product must be populated (verifies batch-fetch preserves fields)
        for line in body["items"]:
            assert line["product"]["product_id"] == line["product_id"]
            assert "price" in line["product"]
            assert "name" in line["product"]

    cart = s.get(f"{API}/cart", headers=_auth(demo_token)).json()
    assert len(cart["items"]) == 3
    assert cart["count"] == sum(qty)
    # totals reconcile
    expected_subtotal = round(sum(picks[i]["price"] * qty[i] for i in range(3)), 2)
    assert abs(cart["subtotal"] - expected_subtotal) < 0.01

    r = s.post(
        f"{API}/checkout",
        json={"address_id": demo_address["address_id"], "payment_method": "cod"},
        headers=_auth(demo_token),
    )
    assert r.status_code == 200, r.text
    order = r.json()
    assert len(order["items"]) == 3
    ordered_map = {i["product_id"]: i["quantity"] for i in order["items"]}
    for pid, q in zip(pids, qty):
        assert ordered_map.get(pid) == q, f"missing/wrong qty for {pid}"

    # all 3 stocks decremented correctly
    for pid, q in zip(pids, qty):
        after = _get_stock(s, pid)
        assert after == before[pid] - q, (
            f"stock mismatch for {pid}: before={before[pid]} after={after} qty={q}"
        )

    # cart cleared
    final = s.get(f"{API}/cart", headers=_auth(demo_token)).json()
    assert final["count"] == 0
