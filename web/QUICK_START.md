# ⚡ Quick Start Deployment Checklist for www.gkgifts.store

## 🎯 BEFORE YOU START
Copy and save this checklist. Check off items as you complete them.

```
PRE-DEPLOYMENT REQUIREMENTS
☐ Hostinger account login ready
☐ Domain: www.gkgifts.store is registered/transferred
☐ Backend API URL confirmed (for NEXT_PUBLIC_API_URL)
☐ Node.js 18+ installed locally
☐ Git installed locally
```

---

## 🚀 FASTEST DEPLOYMENT (Git - Recommended) - 5 Steps

### ✅ STEP 1: Login to Hostinger
```
1. Go to: https://hpanel.hostinger.com
2. Enter email and password
3. Select domain: gkgifts.store
4. Look for: Hosting > Manage
```

### ✅ STEP 2: Setup Git Deployment
```
1. Click: Hosting > Manage > Git
2. Click: Deploy Repository
3. Choose: Deploy from GitHub
4. Authorize GitHub access when prompted
5. Select Repository: ddubey101/GKGifts
6. Select Branch: web-version
7. Deployment Directory: /public_html
```

### ✅ STEP 3: Configure Build Settings
```
In Hostinger control panel:
1. Find: Build command field
2. Enter: npm install && npm run build
3. Find: Startup command field
4. Enter: npm run start
5. Ensure: Node.js version is 18 or 20
```

### ✅ STEP 4: Add Environment Variables
```
In Hostinger (same panel):
1. Find: Environment Variables section
2. Add Variable 1:
   Key: NEXT_PUBLIC_API_URL
   Value: https://your-api-domain.com
3. Add Variable 2:
   Key: NODE_ENV
   Value: production
4. Click: Save
```

### ✅ STEP 5: Deploy
```
1. Click: DEPLOY button (big blue button)
2. Wait for build... (watch the logs)
3. Build should complete in 5-15 minutes
4. Once done, visit: https://www.gkgifts.store
5. 🎉 Your site is LIVE!
```

---

## 🔐 SSL CERTIFICATE (HTTPS) - 2 Steps

### ✅ STEP 6: Generate SSL Certificate
```
1. In Hostinger: Hosting > SSL
2. Click: Free Let's Encrypt SSL
3. Select domain: www.gkgifts.store
4. Click: Issue Certificate
5. Wait 5-15 minutes (auto-refresh page)
6. Status should change to: Active ✓
```

### ✅ STEP 7: Verify HTTPS Works
```
1. Visit: https://www.gkgifts.store
2. Look for: 🔒 Green lock in browser
3. Click lock icon > Certificate info
4. Should show: Valid certificate
5. All traffic is now SECURE ✓
```

---

## ✅ VERIFICATION AFTER DEPLOYMENT

Run through this checklist to verify everything works:

### Website Access
- [ ] https://www.gkgifts.store loads (no error)
- [ ] Shows home page with logo and navigation
- [ ] Page loads in under 3 seconds
- [ ] 🔒 Green SSL lock appears

### Navigation
- [ ] "Sign In" link works (goes to /login)
- [ ] "Sign Up" link works (goes to /signup)
- [ ] Back button works properly
- [ ] Mobile view is responsive (resize browser)

### Authentication Pages
- [ ] Login page loads with email/password fields
- [ ] Signup page loads with confirmation password field
- [ ] Forms are properly styled (orange buttons, white boxes)
- [ ] Forms are responsive on mobile

### Technical Checks
- [ ] Open browser console (F12 > Console)
- [ ] No red errors shown
- [ ] Network tab shows successful requests (200 OK)
- [ ] API calls appear if backend is running

### Performance
- [ ] Page loads within 3 seconds
- [ ] No images are broken (all visible)
- [ ] Styling looks correct (colors, fonts, layout)
- [ ] Buttons are clickable and responsive

---

## 🐛 QUICK TROUBLESHOOTING

### Problem: "Application not running" or Error 503
```
SOLUTION:
1. Wait 2-5 minutes (Hostinger is still building)
2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check Hostinger logs: Hosting > Node.js > View Logs
4. If still failing:
   - Verify startup command is: npm run start
   - Check Node.js version: must be 18+
   - Ensure all files uploaded correctly
```

### Problem: "Cannot reach website" or DNS Error
```
SOLUTION:
1. DNS might not be propagated (up to 48 hours)
2. Test DNS: https://www.whatsmydns.net/?domain=gkgifts.store
3. Should show Hostinger IP address
4. If showing different IP:
   - Check domain registrar's nameserver settings
   - Update to Hostinger nameservers (if needed)
```

### Problem: "Connection to API failed" or CORS Error
```
SOLUTION:
1. Verify NEXT_PUBLIC_API_URL is correct in Hostinger
2. Check your backend API is running
3. Test API directly: https://your-api-url/health
4. Add CORS headers to API:
   Access-Control-Allow-Origin: https://www.gkgifts.store
```

### Problem: "SSL Certificate shows error" or 🔓 Red lock
```
SOLUTION:
1. Wait 15+ minutes after issuing certificate
2. Hard refresh browser: Ctrl+Shift+R
3. Try in private/incognito window
4. If still fails:
   - Generate new certificate in Hostinger
   - Wait for status to show: Active ✓
```

---

## 📱 MOBILE TESTING

After deployment, test on mobile devices:

```
1. On phone, go to: https://www.gkgifts.store
2. Check layout looks good (no overflow, proper spacing)
3. Test all buttons work on touch
4. Forms should be easy to fill on mobile
5. Navigation should work smoothly
```

**Test on multiple devices if possible:**
- [ ] iPhone/iOS
- [ ] Android phone
- [ ] Tablet (if available)

---

## 🔄 NEXT STEPS AFTER DEPLOYMENT

### If Everything Works ✅
```
1. ✅ Backup your code: git push origin web-version
2. ✅ Share link: https://www.gkgifts.store
3. ✅ Monitor for 24 hours for issues
4. ✅ Set up Google Analytics (optional)
5. ✅ Plan marketing/launch strategy
```

### If You Need to Update Code
```
1. Make changes locally in web/ directory
2. Commit: git add . && git commit -m "Update"
3. Push: git push origin web-version
4. Hostinger auto-deploys (if Git sync enabled)
5. Wait 2-5 minutes for new build
6. Hard refresh: Ctrl+Shift+R
```

### If You Need Support
```
1. Check Hostinger logs: Hosting > Node.js > View Logs
2. Contact Hostinger: https://support.hostinger.com
3. Check Next.js docs: https://nextjs.org/docs
4. Browser console (F12) for client-side errors
```

---

## 📊 MONITORING CHECKLIST

### Daily (First Week)
- [ ] Visit site: https://www.gkgifts.store (check it loads)
- [ ] Check console for errors: F12 > Console
- [ ] Monitor response time (should be < 3 seconds)

### Weekly
- [ ] Check Hostinger logs for errors
- [ ] Review Google Analytics (if set up)
- [ ] Monitor disk usage in Hostinger
- [ ] Back up code: git push origin web-version

### Monthly
- [ ] Update dependencies: npm update
- [ ] Create manual backup in Hostinger
- [ ] Check SSL certificate expiration (auto-renews)
- [ ] Review Core Web Vitals: https://pagespeed.web.dev

---

## 🎯 IMPORTANT LINKS FOR YOUR DOMAIN

Save these links for easy access:

**Your Live Site:**
- 🌐 https://www.gkgifts.store

**Hostinger Control Panel:**
- 🔐 https://hpanel.hostinger.com

**Hostinger Hosting Management:**
- 📊 https://hpanel.hostinger.com/hosting/manage

**GitHub Repository (Web Version):**
- 💾 https://github.com/ddubey101/GKGifts/tree/web-version

**Deployment Documentation:**
- 📖 See: web/DEPLOYMENT_GUIDE.md in web-version branch

---

## 💡 PRO TIPS

1. **Enable Caching** (faster loading)
   - Hostinger: Hosting > Cache > Enable Browser Caching

2. **Use CDN** (if available in your plan)
   - Hostinger: Hosting > CDN > Enable

3. **Monitor Core Web Vitals**
   - https://pagespeed.web.dev/?url=www.gkgifts.store

4. **Set Up Monitoring**
   - Google Search Console (free SEO monitoring)
   - Google Analytics (traffic tracking)

5. **Keep Backups**
   - Create manual backups monthly in Hostinger
   - Always push code to GitHub before updating

---

## ✨ DEPLOYMENT COMPLETE!

**Your website is now live at:**

```
╔════════════════════════════════════════════╗
║   🎉 https://www.gkgifts.store 🎉         ║
╚════════════════════════════════════════════╝
```

**Status:**
- ✅ Web version created
- ✅ Deployed to Hostinger
- ✅ SSL certificate active
- ✅ Domain configured
- ✅ Ready for users

**Have questions?**
- 📖 See: DEPLOYMENT_GUIDE.md (full guide with all details)
- 💬 Hostinger Support: https://support.hostinger.com
- 📚 Next.js Docs: https://nextjs.org/docs

---

**Last Updated:** 2026-07-24
**Repository:** ddubey101/GKGifts (web-version branch)
**Domain:** www.gkgifts.store
