"""Gk Gifts backend - FastAPI + MongoDB.

Handles auth (email/password JWT + Emergent Google session), catalog,
cart, orders, wishlist, addresses, reviews, coupons, banners, admin.
"""
from __future__ import annotations

import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, List, Optional

import bcrypt
import httpx
import jwt as pyjwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.routing import APIRouter
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Base URL where THIS backend is publicly reachable. Used to build absolute
# image URLs baked into category/banner seed rows so mobile clients on any
# origin can load them. Falls back to the Emergent preview URL for local dev.
PUBLIC_BACKEND_URL = os.environ.get(
    "PUBLIC_BACKEND_URL",
    "https://scalable-marketplace-4.preview.emergentagent.com",
).rstrip("/")

JWT_SECRET = os.environ.get("JWT_SECRET", "aura-commerce-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 7  # 7 days

EMERGENT_SESSION_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Aura Commerce API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("aura")
logging.basicConfig(level=logging.INFO)


# ---------- helpers ---------------------------------------------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def check_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def _resolve_bearer(token: str) -> Optional[dict]:
    """Look up user from JWT or Emergent session_token."""
    # 1) try JWT
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
        if uid:
            user = await db.users.find_one({"user_id": uid}, {"_id": 0})
            if user:
                return user
    except Exception:
        pass
    # 2) try session store (Google login)
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < now_utc():
        return None
    return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})


async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.split(" ", 1)[1].strip()
    user = await _resolve_bearer(token)
    if not user:
        raise HTTPException(401, "Invalid or expired token")
    return user


async def optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return await _resolve_bearer(authorization.split(" ", 1)[1].strip())


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------- schemas ---------------------------------------------------------

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_token: str  # from Emergent session-data response


class AddressIn(BaseModel):
    label: str = "Home"
    full_name: str
    phone: str
    line1: str
    line2: str = ""
    city: str
    state: str
    pincode: str
    is_default: bool = False


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = 1
    variant: Optional[str] = None


class ReviewIn(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    title: str = ""
    body: str = ""


class CheckoutIn(BaseModel):
    address_id: str
    payment_method: str = "cod"  # cod | mock_card
    coupon_code: Optional[str] = None
    delivery_slot: Optional[str] = None


class ProductIn(BaseModel):
    name: str
    brand: str
    category_id: str
    description: str = ""
    price: float
    mrp: float
    images: List[str] = []
    stock: int = 100
    tags: List[str] = []
    variants: List[dict] = []
    rating: float = 0
    review_count: int = 0


class ProductPatchIn(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    tags: Optional[List[str]] = None
    variants: Optional[List[dict]] = None


class StockPatchIn(BaseModel):
    stock: Optional[int] = None   # absolute value
    delta: Optional[int] = None   # relative +/-


# ---------- auth ------------------------------------------------------------

@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    uid = new_id("user")
    user = {
        "user_id": uid,
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": hash_pw(body.password),
        "picture": "",
        "role": "customer",
        "provider": "password",
        "created_at": now_utc(),
    }
    await db.users.insert_one(user)
    token = make_jwt(uid)
    _strip(user)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid email or password")
    if not check_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_jwt(user["user_id"])
    _strip(user)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api.post("/auth/google")
async def google_login(body: GoogleSessionIn):
    """Frontend already exchanged session_id for session_token via Emergent.
    We now verify and persist the user + session."""
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(
            EMERGENT_SESSION_URL,
            headers={"X-Session-ID": body.session_token},
        )
    if r.status_code != 200:
        # session_token itself may have been sent as session_id - accept both paths
        raise HTTPException(401, "Invalid Google session")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "No email in Google session")
    existing = await db.users.find_one({"email": email})
    if existing:
        uid = existing["user_id"]
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"picture": data.get("picture", ""), "name": data.get("name", existing.get("name"))}},
        )
    else:
        uid = new_id("user")
        await db.users.insert_one(
            {
                "user_id": uid,
                "email": email,
                "name": data.get("name", ""),
                "picture": data.get("picture", ""),
                "role": "customer",
                "provider": "google",
                "created_at": now_utc(),
            }
        )
    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one(
        {
            "session_token": session_token,
            "user_id": uid,
            "created_at": now_utc(),
            "expires_at": now_utc() + timedelta(days=7),
        }
    )
    user = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    return {"token": session_token, "user": user}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    user.pop("password_hash", None)
    return user


@api.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        tok = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": tok})
    return {"ok": True}


# ---------- catalog ---------------------------------------------------------

@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return cats


@api.get("/banners")
async def list_banners():
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners


# Special virtual category IDs → max price (INR). Products endpoint translates
# these into a price filter instead of a category_id match.
PRICE_BAND_CATEGORIES = {
    "cat_under_50": 50,
    "cat_under_100": 100,
    "cat_under_200": 200,
}


@api.get("/products")
async def list_products(
    category_id: Optional[str] = None,
    q: Optional[str] = None,
    tag: Optional[str] = None,
    sort: str = "popular",
    limit: int = Query(50, le=200),
    skip: int = 0,
):
    query: dict = {}
    if category_id in PRICE_BAND_CATEGORIES:
        query["price"] = {"$lte": PRICE_BAND_CATEGORIES[category_id]}
    elif category_id:
        query["category_id"] = category_id
    if tag:
        query["tags"] = tag
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    sort_map = {
        "popular": [("review_count", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("rating", -1)],
        "new": [("created_at", -1)],
    }
    cursor = db.products.find(query, {"_id": 0}).sort(sort_map.get(sort, sort_map["popular"]))
    products = await cursor.skip(skip).limit(limit).to_list(limit)
    return products


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)
    p["reviews"] = reviews
    return p


@api.get("/search/suggest")
async def suggest(q: str = ""):
    if not q:
        popular = await db.products.find({}, {"_id": 0, "name": 1}).sort("review_count", -1).limit(6).to_list(6)
        return [p["name"] for p in popular]
    regex = {"$regex": q, "$options": "i"}
    items = await db.products.find({"$or": [{"name": regex}, {"brand": regex}]}, {"_id": 0, "name": 1}).limit(8).to_list(8)
    return [p["name"] for p in items]


# ---------- cart ------------------------------------------------------------

async def _get_cart(uid: str) -> dict:
    cart = await db.carts.find_one({"user_id": uid}, {"_id": 0})
    if not cart:
        cart = {"user_id": uid, "items": [], "updated_at": now_utc()}
        await db.carts.insert_one(dict(cart))
    return cart


async def _hydrate_cart(cart: dict) -> dict:
    raw_items = cart.get("items", [])
    if not raw_items:
        return {"items": [], "subtotal": 0.0, "shipping": 0, "tax": 0.0, "total": 0.0, "count": 0}
    ids = [it["product_id"] for it in raw_items]
    products = await db.products.find({"product_id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    pmap = {p["product_id"]: p for p in products}
    items = []
    subtotal = 0.0
    for it in raw_items:
        p = pmap.get(it["product_id"])
        if not p:
            continue
        qty = it["quantity"]
        line_total = p["price"] * qty
        subtotal += line_total
        items.append({**it, "product": p, "line_total": round(line_total, 2)})
    shipping = 0 if subtotal >= 499 or subtotal == 0 else 49
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + shipping + tax, 2)
    return {
        "items": items,
        "subtotal": round(subtotal, 2),
        "shipping": shipping,
        "tax": tax,
        "total": total,
        "count": sum(i["quantity"] for i in items),
    }


@api.get("/cart")
async def get_cart(user: dict = Depends(current_user)):
    return await _hydrate_cart(await _get_cart(user["user_id"]))


@api.post("/cart/add")
async def cart_add(body: CartItemIn, user: dict = Depends(current_user)):
    cart = await _get_cart(user["user_id"])
    items = cart["items"]
    for it in items:
        if it["product_id"] == body.product_id and it.get("variant") == body.variant:
            it["quantity"] += body.quantity
            break
    else:
        items.append(body.model_dump())
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": items, "updated_at": now_utc()}},
    )
    return await _hydrate_cart({"items": items})


@api.post("/cart/update")
async def cart_update(body: CartItemIn, user: dict = Depends(current_user)):
    cart = await _get_cart(user["user_id"])
    items = [i for i in cart["items"] if i["product_id"] != body.product_id]
    if body.quantity > 0:
        items.append(body.model_dump())
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": items, "updated_at": now_utc()}},
    )
    return await _hydrate_cart({"items": items})


@api.post("/cart/clear")
async def cart_clear(user: dict = Depends(current_user)):
    await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": [], "updated_at": now_utc()}},
    )
    return {"ok": True}


# ---------- wishlist --------------------------------------------------------

@api.get("/wishlist")
async def wishlist_get(user: dict = Depends(current_user)):
    wl = await db.wishlists.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {"product_ids": []}
    if not wl["product_ids"]:
        return []
    products = await db.products.find({"product_id": {"$in": wl["product_ids"]}}, {"_id": 0}).to_list(200)
    return products


@api.post("/wishlist/toggle")
async def wishlist_toggle(body: dict, user: dict = Depends(current_user)):
    pid = body.get("product_id")
    if not pid:
        raise HTTPException(400, "product_id required")
    wl = await db.wishlists.find_one({"user_id": user["user_id"]}) or {"user_id": user["user_id"], "product_ids": []}
    ids = wl.get("product_ids", [])
    if pid in ids:
        ids.remove(pid)
        added = False
    else:
        ids.append(pid)
        added = True
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"product_ids": ids}},
        upsert=True,
    )
    return {"added": added, "product_ids": ids}


# ---------- addresses -------------------------------------------------------

@api.get("/addresses")
async def addresses_list(user: dict = Depends(current_user)):
    items = await db.addresses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    return items


@api.post("/addresses")
async def address_add(body: AddressIn, user: dict = Depends(current_user)):
    aid = new_id("addr")
    doc = {"address_id": aid, "user_id": user["user_id"], **body.model_dump(), "created_at": now_utc()}
    if body.is_default:
        await db.addresses.update_many({"user_id": user["user_id"]}, {"$set": {"is_default": False}})
    await db.addresses.insert_one(doc)
    return _strip(doc)


@api.delete("/addresses/{address_id}")
async def address_delete(address_id: str, user: dict = Depends(current_user)):
    await db.addresses.delete_one({"address_id": address_id, "user_id": user["user_id"]})
    return {"ok": True}


# ---------- coupons ---------------------------------------------------------

@api.get("/coupons")
async def coupons_list():
    return await db.coupons.find({}, {"_id": 0}).to_list(50)


async def _apply_coupon(code: str, subtotal: float) -> tuple[float, Optional[dict]]:
    if not code:
        return 0.0, None
    c = await db.coupons.find_one({"code": code.upper()}, {"_id": 0})
    if not c:
        raise HTTPException(400, "Invalid coupon")
    if subtotal < c.get("min_order", 0):
        raise HTTPException(400, f"Min order ₹{c['min_order']} for this coupon")
    if c["type"] == "percent":
        disc = round(subtotal * c["value"] / 100.0, 2)
        if c.get("max_discount"):
            disc = min(disc, c["max_discount"])
    else:
        disc = float(c["value"])
    return disc, c


# ---------- orders ----------------------------------------------------------

@api.post("/checkout")
async def checkout(body: CheckoutIn, user: dict = Depends(current_user)):
    cart = await _hydrate_cart(await _get_cart(user["user_id"]))
    if not cart["items"]:
        raise HTTPException(400, "Cart is empty")
    addr = await db.addresses.find_one(
        {"address_id": body.address_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not addr:
        raise HTTPException(400, "Address not found")
    discount, coupon = await _apply_coupon(body.coupon_code or "", cart["subtotal"])
    total = round(cart["subtotal"] + cart["shipping"] + cart["tax"] - discount, 2)
    if total < 0:
        total = 0
    oid = new_id("ord")
    order = {
        "order_id": oid,
        "user_id": user["user_id"],
        "items": [
            {
                "product_id": i["product_id"],
                "name": i["product"]["name"],
                "image": (i["product"].get("images") or [""])[0],
                "price": i["product"]["price"],
                "quantity": i["quantity"],
                "variant": i.get("variant"),
            }
            for i in cart["items"]
        ],
        "address": addr,
        "subtotal": cart["subtotal"],
        "shipping": cart["shipping"],
        "tax": cart["tax"],
        "discount": discount,
        "coupon_code": coupon["code"] if coupon else None,
        "total": total,
        "payment_method": body.payment_method,
        "delivery_slot": body.delivery_slot or "Standard (3-5 days)",
        "status": "confirmed",
        "timeline": [
            {"status": "confirmed", "label": "Order Confirmed", "at": now_utc().isoformat()}
        ],
        "created_at": now_utc(),
    }
    await db.orders.insert_one(order)
    # decrement stock (batched)
    bulk_ops = [
        UpdateOne({"product_id": i["product_id"]}, {"$inc": {"stock": -i["quantity"]}})
        for i in cart["items"]
    ]
    if bulk_ops:
        await db.products.bulk_write(bulk_ops)
    # in-app notification
    await db.notifications.insert_one(
        {
            "notif_id": new_id("ntf"),
            "user_id": user["user_id"],
            "title": "Order confirmed",
            "body": f"Your order {oid[-6:].upper()} has been placed. Total ₹{total:.0f}.",
            "kind": "order",
            "read": False,
            "created_at": now_utc(),
        }
    )
    # clear cart
    await db.carts.update_one({"user_id": user["user_id"]}, {"$set": {"items": []}})
    return _strip(order)


@api.get("/orders")
async def orders_list(user: dict = Depends(current_user)):
    return await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.get("/orders/{order_id}")
async def order_get(order_id: str, user: dict = Depends(current_user)):
    o = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")
    return o


@api.post("/orders/{order_id}/cancel")
async def order_cancel(order_id: str, user: dict = Depends(current_user)):
    o = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]})
    if not o:
        raise HTTPException(404, "Not found")
    if o["status"] in ("delivered", "cancelled"):
        raise HTTPException(400, "Cannot cancel this order")
    tl = o.get("timeline", []) + [{"status": "cancelled", "label": "Cancelled by customer", "at": now_utc().isoformat()}]
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "cancelled", "timeline": tl}})
    return {"ok": True}


# ---------- reviews ---------------------------------------------------------

@api.post("/reviews")
async def review_add(body: ReviewIn, user: dict = Depends(current_user)):
    rid = new_id("rev")
    doc = {
        "review_id": rid,
        "product_id": body.product_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", "Customer"),
        "rating": body.rating,
        "title": body.title,
        "body": body.body,
        "created_at": now_utc(),
    }
    await db.reviews.insert_one(dict(doc))
    # recompute product rating
    all_r = await db.reviews.find({"product_id": body.product_id}, {"_id": 0, "rating": 1}).to_list(1000)
    avg = round(sum(r["rating"] for r in all_r) / len(all_r), 2)
    await db.products.update_one(
        {"product_id": body.product_id},
        {"$set": {"rating": avg, "review_count": len(all_r)}},
    )
    return _strip(doc)


# ---------- notifications ---------------------------------------------------

@api.get("/notifications")
async def notifs_list(user: dict = Depends(current_user)):
    return await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


@api.post("/notifications/read-all")
async def notifs_read_all(user: dict = Depends(current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- admin -----------------------------------------------------------

@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    orders = await db.orders.find(
        {},
        {"_id": 0, "order_id": 1, "total": 1, "status": 1, "created_at": 1, "items": 1, "user_id": 1},
    ).sort("created_at", -1).limit(500).to_list(500)
    revenue = sum(o["total"] for o in orders)
    users = await db.users.count_documents({})
    products = await db.products.count_documents({})
    low_stock = await db.products.count_documents({"stock": {"$lt": 10}})
    top = await db.products.find({}, {"_id": 0}).sort("review_count", -1).limit(5).to_list(5)
    return {
        "revenue": round(revenue, 2),
        "orders": len(orders),
        "users": users,
        "products": products,
        "low_stock": low_stock,
        "top_products": top,
        "recent_orders": sorted(orders, key=lambda o: o["created_at"], reverse=True)[:8],
    }


@api.get("/admin/orders")
async def admin_orders(_: dict = Depends(require_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


@api.post("/admin/orders/{order_id}/status")
async def admin_order_status(order_id: str, body: dict, _: dict = Depends(require_admin)):
    status = body.get("status")
    if status not in ("confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"):
        raise HTTPException(400, "Invalid status")
    o = await db.orders.find_one({"order_id": order_id})
    if not o:
        raise HTTPException(404, "Not found")
    labels = {
        "confirmed": "Order Confirmed",
        "packed": "Packed",
        "shipped": "Shipped",
        "out_for_delivery": "Out for delivery",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
    }
    tl = o.get("timeline", []) + [{"status": status, "label": labels[status], "at": now_utc().isoformat()}]
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": status, "timeline": tl}})
    # notify
    await db.notifications.insert_one(
        {
            "notif_id": new_id("ntf"),
            "user_id": o["user_id"],
            "title": f"Order {labels[status]}",
            "body": f"Order {order_id[-6:].upper()} is now {labels[status]}.",
            "kind": "order",
            "read": False,
            "created_at": now_utc(),
        }
    )
    return {"ok": True}


@api.post("/admin/products")
async def admin_product_create(body: ProductIn, _: dict = Depends(require_admin)):
    pid = new_id("prd")
    doc = {"product_id": pid, **body.model_dump(), "created_at": now_utc()}
    await db.products.insert_one(dict(doc))
    return _strip(doc)


@api.get("/admin/products")
async def admin_product_list(
    _: dict = Depends(require_admin),
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = Query(100, le=500),
):
    query: dict = {}
    if category_id:
        query["category_id"] = category_id
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
        ]
    return await db.products.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@api.patch("/admin/products/{product_id}")
async def admin_product_update(
    product_id: str, body: ProductPatchIn, _: dict = Depends(require_admin)
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = now_utc()
    r = await db.products.update_one({"product_id": product_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})


@api.patch("/admin/products/{product_id}/stock")
async def admin_product_stock(
    product_id: str, body: StockPatchIn, _: dict = Depends(require_admin)
):
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    if body.stock is not None:
        new_stock = int(body.stock)
    elif body.delta is not None:
        new_stock = int(p.get("stock", 0)) + int(body.delta)
    else:
        raise HTTPException(400, "Provide stock or delta")
    if new_stock < 0:
        new_stock = 0
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"stock": new_stock, "updated_at": now_utc()}},
    )
    return {"product_id": product_id, "stock": new_stock}


@api.delete("/admin/products/{product_id}")
async def admin_product_delete(product_id: str, _: dict = Depends(require_admin)):
    r = await db.products.delete_one({"product_id": product_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    # cascade: remove from carts and wishlists so the app doesn't see dangling refs
    await db.carts.update_many({}, {"$pull": {"items": {"product_id": product_id}}})
    await db.wishlists.update_many({}, {"$pull": {"product_ids": product_id}})
    return {"ok": True, "product_id": product_id}


@api.get("/health")
async def health():
    return {"ok": True, "time": now_utc().isoformat()}


# ---------- seed ------------------------------------------------------------

DEMO_CATEGORIES = [
    {"category_id": "cat_kids_bags", "name": "Kids Bags", "icon": "bag-handle", "order": 1,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/qbxt1hcgjIRN6nV._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_kids_dining", "name": "Kids Dining", "icon": "restaurant", "order": 2,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/Fbxt1xQIV0D4tLx._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_kids_room", "name": "Kids Room", "icon": "happy", "order": 3,
     "image": f"{PUBLIC_BACKEND_URL}/api/images/IMG_6410.JPG"},
    {"category_id": "cat_drinkware", "name": "Drinkware", "icon": "cafe", "order": 4,
     "image": f"{PUBLIC_BACKEND_URL}/api/images/IMG_6437.PNG"},
    {"category_id": "cat_gifts", "name": "Gifts & Utility", "icon": "gift", "order": 5,
     "image": f"{PUBLIC_BACKEND_URL}/api/images/legacy_b.jpg"},
    {"category_id": "cat_under_50", "name": "Gifts under Rs.50", "icon": "pricetag", "order": 6,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/9bxt1BL90xaIGYa._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_under_100", "name": "Gifts under Rs.100", "icon": "pricetag", "order": 7,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/Fbxt1xQIV0D4tLx._SL360_QL95_FMwebp_.png"},
    {"category_id": "cat_under_200", "name": "Gifts under Rs.200", "icon": "pricetag", "order": 8,
     "image": "https://m.media-amazon.com/images/X/bxt1/M/mbxt1ROoVacvMOJ._SL360_QL95_FMwebp_.jpg"},
]

DEMO_BANNERS = [
    {"banner_id": "bn1", "order": 1,
     "title": "Kids Bags Sale", "subtitle": "Up to 42% off",
     "image": "https://m.media-amazon.com/images/X/bxt1/M/qbxt1hcgjIRN6nV._SL360_QL95_FMwebp_.png",
     "cta": "Shop now", "link": "cat_kids_bags"},
    {"banner_id": "bn2", "order": 2,
     "title": "Mealtime Magic", "subtitle": "Cutlery, lunch boxes & more",
     "image": "https://m.media-amazon.com/images/X/bxt1/M/Fbxt1xQIV0D4tLx._SL360_QL95_FMwebp_.png",
     "cta": "Explore", "link": "cat_kids_dining"},
    {"banner_id": "bn3", "order": 3,
     "title": "Little Room, Big Joy", "subtitle": "Clocks, storage & hair clips",
     "image": f"{PUBLIC_BACKEND_URL}/api/images/IMG_6410.JPG",
     "cta": "Discover", "link": "cat_kids_room"},
]

# Real catalog is loaded via /app/backend/scripts/sync_gkgifts_store.py after
# startup — no demo products are seeded here anymore.
DEMO_PRODUCTS: list[dict] = []

DEMO_COUPONS = [
    {"code": "WELCOME10", "type": "percent", "value": 10, "min_order": 999, "max_discount": 300,
     "title": "10% off first order", "description": "Save 10% on orders above ₹999"},
    {"code": "SAVE200", "type": "flat", "value": 200, "min_order": 1499,
     "title": "Flat ₹200 off", "description": "On orders above ₹1499"},
    {"code": "AURA25", "type": "percent", "value": 25, "min_order": 2999, "max_discount": 800,
     "title": "25% off orders above ₹2999", "description": "Bigger cart, bigger savings"},
]


@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.products.create_index("product_id", unique=True)
    await db.categories.create_index("category_id", unique=True)
    await db.orders.create_index("order_id", unique=True)

    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([dict(c) for c in DEMO_CATEGORIES])
    if await db.banners.count_documents({}) == 0:
        await db.banners.insert_many([dict(b) for b in DEMO_BANNERS])
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([dict(c) for c in DEMO_COUPONS])
    if await db.products.count_documents({}) == 0:
        for p in DEMO_PRODUCTS:
            await db.products.insert_one({"product_id": new_id("prd"), **p, "created_at": now_utc()})
    # remove legacy seed users from previous brand (aura) so credentials stay clean
    await db.users.delete_many({"email": {"$in": ["admin@aura.com", "demo@aura.com"]}})
    # seed admin + demo customer under new brand
    if not await db.users.find_one({"email": "admin@gkgifts.com"}):
        await db.users.insert_one({
            "user_id": new_id("user"),
            "email": "admin@gkgifts.com",
            "name": "Admin",
            "password_hash": hash_pw("Admin@123"),
            "role": "admin",
            "provider": "password",
            "picture": "",
            "created_at": now_utc(),
        })
    if not await db.users.find_one({"email": "demo@gkgifts.com"}):
        await db.users.insert_one({
            "user_id": new_id("user"),
            "email": "demo@gkgifts.com",
            "name": "Demo Shopper",
            "password_hash": hash_pw("Demo@123"),
            "role": "customer",
            "provider": "password",
            "picture": "",
            "created_at": now_utc(),
        })
    logger.info("Gk Gifts seed complete.")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
# Serve product images uploaded by admin / seeded from bulk imports.
app.mount(
    "/api/images",
    StaticFiles(directory=str(ROOT_DIR / "static" / "products"), check_dir=False),
    name="product-images",
)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
