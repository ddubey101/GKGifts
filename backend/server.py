"""Aura Commerce backend - FastAPI + MongoDB.

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
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

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
    if category_id:
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
    items = []
    subtotal = 0.0
    for it in cart.get("items", []):
        p = await db.products.find_one({"product_id": it["product_id"]}, {"_id": 0})
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
    # decrement stock
    for i in cart["items"]:
        await db.products.update_one(
            {"product_id": i["product_id"]},
            {"$inc": {"stock": -i["quantity"]}},
        )
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
    orders = await db.orders.find({}, {"_id": 0}).to_list(2000)
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


@api.get("/health")
async def health():
    return {"ok": True, "time": now_utc().isoformat()}


# ---------- seed ------------------------------------------------------------

DEMO_CATEGORIES = [
    {"category_id": "cat_electronics", "name": "Electronics", "icon": "cellphone", "order": 1,
     "image": "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400"},
    {"category_id": "cat_fashion", "name": "Fashion", "icon": "tshirt-crew", "order": 2,
     "image": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400"},
    {"category_id": "cat_home", "name": "Home", "icon": "sofa", "order": 3,
     "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400"},
    {"category_id": "cat_beauty", "name": "Beauty", "icon": "flower", "order": 4,
     "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400"},
    {"category_id": "cat_sports", "name": "Sports", "icon": "basketball", "order": 5,
     "image": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400"},
    {"category_id": "cat_books", "name": "Books", "icon": "book", "order": 6,
     "image": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400"},
]

DEMO_BANNERS = [
    {"banner_id": "bn1", "order": 1,
     "title": "Autumn Sale", "subtitle": "Up to 60% off",
     "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200",
     "cta": "Shop now", "link": "cat_fashion"},
    {"banner_id": "bn2", "order": 2,
     "title": "New Audio", "subtitle": "Premium headphones",
     "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1200",
     "cta": "Explore", "link": "cat_electronics"},
    {"banner_id": "bn3", "order": 3,
     "title": "Home refresh", "subtitle": "Cozy living, minimal prices",
     "image": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
     "cta": "Discover", "link": "cat_home"},
]

DEMO_PRODUCTS = [
    # Electronics
    {"name": "Aurora Wireless Headphones", "brand": "Sonique", "category_id": "cat_electronics",
     "price": 4499, "mrp": 6999, "stock": 42, "rating": 4.6, "review_count": 218,
     "tags": ["flash_sale", "featured", "trending"],
     "description": "Premium over-ear wireless headphones with ANC and 40h battery life.",
     "images": [
         "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800",
         "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",
     ],
     "variants": [{"name": "Color", "options": ["Onyx", "Sand", "Terracotta"]}]},
    {"name": "PulseFit Smartwatch S3", "brand": "PulseFit", "category_id": "cat_electronics",
     "price": 8999, "mrp": 12999, "stock": 30, "rating": 4.4, "review_count": 156,
     "tags": ["new", "featured"],
     "description": "AMOLED smartwatch with heart-rate, SpO2, GPS, and 14-day battery.",
     "images": [
         "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
         "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800",
     ]},
    {"name": "Nimbus Bluetooth Speaker", "brand": "Sonique", "category_id": "cat_electronics",
     "price": 2499, "mrp": 3999, "stock": 80, "rating": 4.2, "review_count": 92,
     "tags": ["deal", "trending"],
     "description": "Compact 360° speaker with rich bass and 20h playback.",
     "images": ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800"]},
    {"name": "Meridian True Wireless Buds", "brand": "Sonique", "category_id": "cat_electronics",
     "price": 1999, "mrp": 3499, "stock": 120, "rating": 4.3, "review_count": 302,
     "tags": ["flash_sale", "trending", "top"],
     "description": "IPX5 sweat-proof, 8h playback + case, low-latency gaming mode.",
     "images": ["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800"]},
    # Fashion
    {"name": "Terracotta Minimal Sneakers", "brand": "Loft", "category_id": "cat_fashion",
     "price": 3299, "mrp": 4999, "stock": 60, "rating": 4.5, "review_count": 141,
     "tags": ["new", "featured"],
     "description": "Hand-finished leather sneakers with breathable liner.",
     "images": [
         "https://images.pexels.com/photos/2547007/pexels-photo-2547007.jpeg?w=800",
         "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
     ],
     "variants": [{"name": "Size", "options": ["7", "8", "9", "10", "11"]}]},
    {"name": "Everyday Linen Shirt", "brand": "North & West", "category_id": "cat_fashion",
     "price": 1799, "mrp": 2999, "stock": 85, "rating": 4.4, "review_count": 78,
     "tags": ["deal"],
     "description": "Breathable linen shirt, relaxed fit, pre-washed for softness.",
     "images": ["https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800"],
     "variants": [{"name": "Size", "options": ["S", "M", "L", "XL"]}]},
    {"name": "Canvas Weekender Bag", "brand": "Loft", "category_id": "cat_fashion",
     "price": 2599, "mrp": 3999, "stock": 45, "rating": 4.6, "review_count": 63,
     "tags": ["featured"],
     "description": "Waxed canvas duffel with leather trims. Fits a 15\" laptop.",
     "images": ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800"]},
    # Home
    {"name": "Ceramic Pour-Over Kettle", "brand": "Hearth", "category_id": "cat_home",
     "price": 1299, "mrp": 1999, "stock": 70, "rating": 4.7, "review_count": 210,
     "tags": ["top", "featured"],
     "description": "Hand-thrown ceramic kettle for the perfect pour-over.",
     "images": ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800"]},
    {"name": "Warm Linen Throw", "brand": "Hearth", "category_id": "cat_home",
     "price": 1899, "mrp": 2999, "stock": 55, "rating": 4.5, "review_count": 96,
     "tags": ["new"],
     "description": "Stone-washed pure linen throw, 130x170 cm.",
     "images": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"]},
    # Beauty
    {"name": "Rosehip Glow Serum", "brand": "Bloom", "category_id": "cat_beauty",
     "price": 899, "mrp": 1499, "stock": 200, "rating": 4.8, "review_count": 512,
     "tags": ["top", "trending"],
     "description": "Cold-pressed rosehip oil serum. Vegan, 30ml.",
     "images": ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"]},
    # Sports
    {"name": "GripFlex Yoga Mat", "brand": "Move", "category_id": "cat_sports",
     "price": 1499, "mrp": 2299, "stock": 90, "rating": 4.4, "review_count": 141,
     "tags": ["deal", "new"],
     "description": "6mm cushioned TPE mat with alignment lines.",
     "images": ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800"]},
    # Books
    {"name": "The Quiet Craft", "brand": "Ivy Press", "category_id": "cat_books",
     "price": 499, "mrp": 799, "stock": 300, "rating": 4.7, "review_count": 88,
     "tags": ["featured"],
     "description": "A book on the discipline of making meaningful things.",
     "images": ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800"]},
]

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
    # seed admin + demo customer
    if not await db.users.find_one({"email": "admin@aura.com"}):
        await db.users.insert_one({
            "user_id": new_id("user"),
            "email": "admin@aura.com",
            "name": "Admin",
            "password_hash": hash_pw("Admin@123"),
            "role": "admin",
            "provider": "password",
            "picture": "",
            "created_at": now_utc(),
        })
    if not await db.users.find_one({"email": "demo@aura.com"}):
        await db.users.insert_one({
            "user_id": new_id("user"),
            "email": "demo@aura.com",
            "name": "Demo Shopper",
            "password_hash": hash_pw("Demo@123"),
            "role": "customer",
            "provider": "password",
            "picture": "",
            "created_at": now_utc(),
        })
    logger.info("Aura Commerce seed complete.")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
