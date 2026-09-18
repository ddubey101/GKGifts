"""Cloudflare R2 (S3-compatible) helpers for GK Gifts.

Public reads go straight to R2's pub-*.r2.dev URL — the backend only handles
writes, so we never proxy image bytes and the free R2 read quota isn't burned
by our own server.

Env vars (`R2_*`) are read lazily inside each accessor so this module is
robust against future import-order regressions in server.py.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config

CONTENT_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif",  ".svg": "image/svg+xml",
}


def _env(key: str) -> str:
    return (os.environ.get(key) or "").strip().rstrip("/") if key.endswith("_URL") or key == "R2_ENDPOINT" \
        else (os.environ.get(key) or "").strip()


def R2_PUBLIC_URL() -> str:  # noqa: N802
    return _env("R2_PUBLIC_URL")


def is_configured() -> bool:
    return all(_env(k) for k in ("R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"))


def _client():
    if not is_configured():
        raise RuntimeError("R2 is not configured — check R2_* env vars in backend/.env")
    return boto3.client(
        "s3",
        endpoint_url=_env("R2_ENDPOINT"),
        aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_bytes(data: bytes, key: str, content_type: Optional[str] = None) -> str:
    """Upload raw bytes to R2 under `key`. Returns the public URL."""
    ct = content_type or CONTENT_TYPES.get(Path(key).suffix.lower(), "application/octet-stream")
    _client().put_object(
        Bucket=_env("R2_BUCKET"), Key=key, Body=data,
        ContentType=ct, CacheControl="public, max-age=31536000, immutable",
    )
    return f"{_env('R2_PUBLIC_URL')}/{key}"


def upload_file(local_path: str, key: Optional[str] = None) -> str:
    """Upload a local file. `key` defaults to a random UUID + original extension."""
    p = Path(local_path)
    key = key or f"products/{uuid.uuid4().hex}{p.suffix.lower()}"
    with p.open("rb") as f:
        return upload_bytes(f.read(), key)


def new_key(original_name: str, folder: str = "products") -> str:
    """Deterministic upload key: {folder}/{uuid}.{ext} — never collides."""
    ext = Path(original_name).suffix.lower() or ".bin"
    return f"{folder}/{uuid.uuid4().hex}{ext}"
