# Aura Commerce – Product Requirements

## Overview
Amazon-style customer mobile shopping app + basic in-app admin, built with Expo React Native, FastAPI, and MongoDB.

## Scope (this MVP)
- Auth: JWT email/password + Emergent Google OAuth
- Home: banner carousel, categories, flash sale, featured grid, new arrivals
- Search: full-text + suggestions + sort chips
- Category browse (`/category/[id]`)
- Product detail: image gallery, variants, rating, reviews, add-to-cart with haptics
- Cart: qty edit, subtotal/shipping/tax, sticky checkout
- Checkout: address CRUD, delivery slot, payment (COD/mock card), coupon apply, place order
- Orders list + order detail with timeline + cancel
- Wishlist toggle
- Addresses CRUD
- Offers / coupons page (copy code)
- Notifications inbox (auto-generated on order events)
- Admin (role=admin): KPIs, top products, low stock, orders list, advance status

## Out of scope for MVP
- Real payment gateway (Stripe/Razorpay)
- Push notifications (in-app only for now)
- Product admin CRUD UI (backend endpoint exists)
- Reviews upload from mobile UI (backend endpoint exists)

## Backend (FastAPI + MongoDB)
Endpoints prefixed with `/api`:
- auth: /register, /login, /google, /me, /logout
- catalog: /categories, /banners, /products, /products/{id}, /search/suggest
- cart: /cart, /cart/add, /cart/update, /cart/clear
- wishlist: /wishlist, /wishlist/toggle
- addresses: GET/POST/DELETE /addresses
- coupons: /coupons
- checkout: POST /checkout
- orders: /orders, /orders/{id}, /orders/{id}/cancel
- reviews: POST /reviews
- notifications: /notifications, /notifications/read-all
- admin: /admin/stats, /admin/orders, /admin/orders/{id}/status, /admin/products (GET list, POST create), PATCH /admin/products/{id}, PATCH /admin/products/{id}/stock, DELETE /admin/products/{id}

## Seed data
6 categories, 3 banners, 12 products (with images/variants), 3 coupons, admin + demo user auto-created on startup.

## Design
Follows `/app/design_guidelines.json` — "Aura Commerce", iOS-native clean with terracotta/burnt orange accents on warm sand base. No blue/purple.
