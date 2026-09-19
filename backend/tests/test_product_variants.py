"""Focused API coverage for optional multi-type product variants."""
import os

import pytest
import requests


BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def tokens(session):
    admin = session.post(f"{API}/auth/login", json={"email": "admin@gkgifts.com", "password": "Admin@123"})
    customer = session.post(f"{API}/auth/login", json={"email": "demo@gkgifts.com", "password": "Demo@123"})
    assert admin.status_code == 200 and customer.status_code == 200
    return admin.json()["token"], customer.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_variant_selection_is_optional_or_complete(session, tokens):
    admin_token, customer_token = tokens
    categories = session.get(f"{API}/categories").json()
    payload = {
        "name": "Variant regression product",
        "brand": "GK Gifts",
        "category_id": categories[0]["category_id"],
        "category_ids": [categories[0]["category_id"]],
        "price": 99,
        "mrp": 99,
        "stock": 10,
        "variants": [
            {"type": "colour", "options": ["Red", "Blue"]},
            {"type": "pattern", "options": ["Stars", "Floral"]},
        ],
    }
    created = session.post(f"{API}/admin/products", json=payload, headers=auth(admin_token))
    assert created.status_code == 200, created.text
    product_id = created.json()["product_id"]
    try:
        session.post(f"{API}/cart/clear", headers=auth(customer_token))
        missing = session.post(f"{API}/cart/add", json={"product_id": product_id, "quantity": 1}, headers=auth(customer_token))
        assert missing.status_code == 400
        invalid = session.post(
            f"{API}/cart/add",
            json={"product_id": product_id, "quantity": 1, "variant": "Colour: Green / Pattern: Stars"},
            headers=auth(customer_token),
        )
        assert invalid.status_code == 400
        valid = session.post(
            f"{API}/cart/add",
            json={"product_id": product_id, "quantity": 1, "variant": "Colour: Red / Pattern: Stars"},
            headers=auth(customer_token),
        )
        assert valid.status_code == 200, valid.text
        assert valid.json()["items"][0]["variant"] == "Colour: Red / Pattern: Stars"
    finally:
        session.post(f"{API}/cart/clear", headers=auth(customer_token))
        session.delete(f"{API}/admin/products/{product_id}", headers=auth(admin_token))