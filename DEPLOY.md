# Deploy Gk Gifts to your own domain — $0/month stack

This app already builds to web via Expo. You need three free-tier services:

| Layer | Service | Free tier |
|---|---|---|
| Database | **MongoDB Atlas M0** | 512 MB, always-on |
| Backend  | **Render** (Python web service) | 512 MB RAM, sleeps after 15 min idle |
| Frontend | **Netlify** (static hosting)  | 100 GB / month bandwidth |

Total ongoing cost: **₹0**.

---

## 1. Push the code to GitHub

In Emergent, click **Save to Github** at the top-right and follow the prompt.
The repo layout must contain the top-level `render.yaml`, `netlify.toml`,
`backend/`, and `frontend/` folders that are already in place.

---

## 2. Create the database (MongoDB Atlas — 5 min)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. Create a new project → **Build a Cluster** → pick **M0 (Free)** → AWS ap-south-1 (Mumbai) → **Create**.
3. In **Database Access**, create a user (e.g. `gkgifts`) with a strong password. Save it.
4. In **Network Access**, click **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). This is fine for MVP.
5. In **Databases → Connect → Drivers**, copy the connection string. Replace `<password>` with the real password. It looks like:
   ```
   mongodb+srv://gkgifts:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```

Keep this string handy — you'll paste it into Render as `MONGO_URL`.

---

## 3. Deploy the backend (Render — 10 min)

1. Sign up at <https://render.com> using **Sign in with GitHub**.
2. Click **New +** → **Blueprint** → select the `gkgifts` repository you just pushed.
3. Render auto-detects the `render.yaml` and creates the service `gkgifts-api`.
4. It asks you to fill the **secrets marked `sync: false`**:
   - `MONGO_URL` → paste the Atlas connection string from step 2.
   - `PUBLIC_BACKEND_URL` → leave empty for now. Deploy first, then edit.
5. Click **Apply**. First build takes ~5 min. When it says *Live*, note the URL
   (e.g. `https://gkgifts-api.onrender.com`).
6. Go back into the service → **Environment** → set `PUBLIC_BACKEND_URL` =
   `https://gkgifts-api.onrender.com` → **Save**. This triggers one more deploy so
   the seeded category/banner images point at the right host.
7. Verify: open `https://gkgifts-api.onrender.com/api/health` in a browser — you
   should see `{"ok":true,...}`.

Free-tier note: Render spins the service down after 15 min of no traffic. First
request after idle takes ~30–60 s. Fine for MVP; upgrade to `Starter` ($7/mo)
if you need always-on.

### Re-seed the real catalog on the new backend

Once the backend is live, run these two scripts from your machine
(they hit the API using the seeded admin user):

```bash
export EXPO_PUBLIC_BACKEND_URL=https://gkgifts-api.onrender.com
python backend/scripts/sync_gkgifts_store.py
python backend/scripts/rebuild_categories.py
```

The static product images in `backend/static/products/` are already in the repo,
so `/api/images/*` serves them straight from the Render disk.

---

## 4. Deploy the frontend (Netlify — 5 min)

1. Sign up at <https://app.netlify.com/signup> using **Sign in with GitHub**.
2. **Add new site → Import an existing project** → pick your `gkgifts` repo.
3. Netlify auto-detects `netlify.toml`. Do NOT change the build command.
4. In **Site settings → Environment variables**, add:
   - `EXPO_PUBLIC_BACKEND_URL` = `https://gkgifts-api.onrender.com`
5. Click **Deploy site**. First build takes ~4 min.
6. Netlify gives you a URL like `https://random-name-xxxx.netlify.app`. Open it.
   You should see the GK Gifts login screen. Sign in with `demo@gkgifts.com` / `Demo@123`.

---

## 5. Point `www.gkgifts.store` at Netlify

### 5a. In Netlify
1. **Domain management → Add a domain** → enter `www.gkgifts.store` → **Verify** → **Add**.
2. Also add the apex `gkgifts.store` if you want plain `gkgifts.store` to work.
3. Netlify shows a screen with the exact DNS records to create.

### 5b. At your domain registrar (where you bought gkgifts.store)
Add these DNS records (values Netlify shows are the source of truth — the ones
below are what Netlify typically shows for CNAME-based domains):

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `<your-site>.netlify.app` | 3600 |
| ALIAS / ANAME (or 4 A records) | `@` (apex) | `apex-loadbalancer.netlify.com` (or the 4 Netlify IPs) | 3600 |

- If your registrar doesn't support ALIAS/ANAME, use Netlify's 4 A records for the apex.
- Delete any old `A`, `AAAA`, or `CNAME` records for `@` and `www` first.

### 5c. SSL (auto)
1. Back in Netlify → **Domain management → HTTPS** → **Verify DNS configuration**.
2. Once verified (usually 5–30 min after DNS propagates), Netlify auto-provisions
   a Let's Encrypt certificate. Enable **Force HTTPS**.

Open `https://www.gkgifts.store` — your store is live.

---

## 6. (Optional) Backend on your subdomain

If you want the API on `api.gkgifts.store` instead of the raw Render URL:

1. In Render → your service → **Settings → Custom Domains** → **Add** `api.gkgifts.store`.
2. Add a CNAME at your registrar: `api` → `gkgifts-api.onrender.com`.
3. After it validates, update the Netlify env var `EXPO_PUBLIC_BACKEND_URL` to
   `https://api.gkgifts.store` and redeploy Netlify. Also update `PUBLIC_BACKEND_URL`
   on Render to the same value and redeploy.

---

## What still costs money?

- **Domain renewal** — whatever your registrar charges (~₹800/yr for `.store`).
- **Only if you outgrow the free tiers** — upgrade the specific service. Typical
  first upgrade is Render Starter ($7/mo, ~₹580) to remove cold starts.

Everything else is $0.
