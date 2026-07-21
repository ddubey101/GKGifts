"""Delete every product whose brand is NOT 'GK Gifts' so only the real catalog remains.
Uses the admin DELETE endpoint which also cascades removal from all carts and wishlists.
"""
import requests

BASE = "http://localhost:8001/api"

tok = requests.post(
    f"{BASE}/auth/login",
    json={"email": "admin@gkgifts.com", "password": "Admin@123"},
    timeout=10,
).json()["token"]
h = {"Authorization": f"Bearer {tok}"}

products = requests.get(f"{BASE}/admin/products?limit=500", headers=h, timeout=10).json()
deleted = kept = 0
for p in products:
    if (p.get("brand") or "").strip().lower() == "gk gifts":
        kept += 1
        continue
    r = requests.delete(f"{BASE}/admin/products/{p['product_id']}", headers=h, timeout=10)
    if r.status_code < 300:
        deleted += 1
        print(f"deleted: [{p['brand']}] {p['name']}")
    else:
        print(f"FAIL {p['name']}: {r.status_code} {r.text[:180]}")

print(f"\nDone. deleted={deleted}, kept={kept}")
