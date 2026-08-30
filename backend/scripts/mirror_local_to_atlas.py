"""One-shot: sync the polished preview DB into MongoDB Atlas.

- Purges 2 duplicate products locally that a re-run of seed_gk_products.py
  created after names diverged.
- Then copies products / categories / banners collections from local into
  Atlas, replacing whatever is currently there. Users and orders on Atlas
  are left alone (never overwritten).

Atlas URL is read from ATLAS_MONGO_URL / ATLAS_DB_NAME env vars — never
persisted anywhere.
"""
import os, sys
from pymongo import MongoClient
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('/app/backend/.env'), override=True)

LOCAL_URL = os.environ['MONGO_URL']
LOCAL_DB = os.environ['DB_NAME']

ATLAS_URL = os.environ.get('ATLAS_MONGO_URL') or sys.exit('Set ATLAS_MONGO_URL')
ATLAS_DB = os.environ.get('ATLAS_DB_NAME', 'gkgifts')

DUPE_NAMES = ['Peppa Pig Kids Cutlery Set', '3D Cat Kids Travel Luggage']

local = MongoClient(LOCAL_URL)[LOCAL_DB]
atlas = MongoClient(ATLAS_URL)[ATLAS_DB]

# 1. Purge dupes from local
r = local.products.delete_many({'name': {'$in': DUPE_NAMES}})
print(f'local: deleted {r.deleted_count} dupes')
print(f'local totals: products={local.products.count_documents({})}, '
      f'categories={local.categories.count_documents({})}, '
      f'banners={local.banners.count_documents({})}')

# 2. Mirror the 3 catalog collections into Atlas.
for coll in ['products', 'categories', 'banners']:
    src = list(local[coll].find({}, {'_id': 0}))
    atlas[coll].delete_many({})
    if src:
        atlas[coll].insert_many([dict(d) for d in src])
    print(f'atlas.{coll}: replaced with {len(src)} docs')

# 3. Read-only summary of what Atlas looks like now.
print('\n=== Atlas post-sync ===')
for c in ['products', 'categories', 'banners', 'users', 'orders']:
    print(f'  {c}: {atlas[c].count_documents({})}')
