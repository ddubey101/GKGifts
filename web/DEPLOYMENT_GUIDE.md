# Deployment Guide: GK Gifts Web on Hostinger (www.gkgifts.store)

## 📋 Pre-Deployment Checklist

- [ ] Domain: **www.gkgifts.store** (registered with Hostinger or transferred)
- [ ] Hostinger account active with hosting plan
- [ ] Node.js 18+ installed locally
- [ ] Git installed locally
- [ ] GitHub account with access to repository
- [ ] Backend API URL ready (for `NEXT_PUBLIC_API_URL`)

---

## 🔧 Option 1: Deploy via Git (RECOMMENDED - Fastest)

### Step 1: Setup Git Repository on Hostinger

1. **Login to Hostinger Control Panel**
   - Visit: https://hpanel.hostinger.com
   - Enter your credentials
   - Select your domain: **gkgifts.store**

2. **Navigate to Git Management**
   - Go to: `Hosting > Manage > Git`
   - Click: `Deploy Repository`
   - Choose: `Deploy from GitHub`

3. **Connect GitHub Repository**
   - Authorize GitHub access
   - Select repository: `ddubey101/GKGifts`
   - Select branch: `web-version`
   - Deployment directory: `/public_html/web` or just `/public_html`

4. **Configure Deployment Settings**
   - Deployment path: `/home/your-username/public_html`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Node.js version: 18 or 20

### Step 2: Setup Environment Variables

1. In Hostinger control panel, go to: `Hosting > Manage > Node.js`
2. Find your application
3. Click: `Environment Variables`
4. Add these variables:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NODE_ENV=production
```

### Step 3: Deploy

1. Click: `Deploy` button
2. Wait for build to complete (5-15 minutes)
3. Visit: https://www.gkgifts.store
4. ✅ Site should be live!

---

## 🔧 Option 2: Deploy via FTP (Alternative)

### Step 1: Build Application Locally

```bash
cd web
npm install
npm run build
```

### Step 2: Get FTP Credentials

1. In Hostinger panel: `Hosting > Manage > FTP`
2. Create/view FTP account
3. Copy FTP credentials:
   - **Host:** your-server.hostinger.com
   - **Username:** cpaneluser_gkgifts
   - **Password:** [your-password]
   - **Port:** 21

### Step 3: Upload via FileZilla

1. Download FileZilla: https://filezilla-project.org
2. Open FileZilla
3. Go to: `File > Site Manager > New Site`
4. Enter FTP credentials:
   - Protocol: FTP
   - Host: [your FTP host]
   - User: [your username]
   - Password: [your password]
5. Click: `Connect`
6. Navigate to: `/public_html` folder
7. Upload all files from `web/` directory to `/public_html`

### Step 4: Setup Node.js App in Control Panel

1. In Hostinger: `Hosting > Manage > Node.js`
2. Click: `Create Application`
3. Configure:
   - Domain: www.gkgifts.store
   - Application directory: `/public_html`
   - Startup command: `npm run start`
   - Node.js version: 18 or 20
   - Port: Auto (Hostinger assigns)

4. Set environment variables (same as Option 1)
5. Click: `Deploy`

---

## 🔧 Option 3: Deploy via SSH (Advanced)

### Step 1: Enable SSH Access

1. In Hostinger: `Hosting > Manage > SSH > SSH Keys`
2. Generate new key pair or upload existing key
3. Get SSH command: `ssh user@gkgifts.store -p 22`

### Step 2: Connect via SSH

```bash
ssh your-username@gkgifts.store -p 22
```

### Step 3: Clone and Setup

```bash
cd ~/public_html
git clone https://github.com/ddubey101/GKGifts.git
cd GKGifts/web
npm install
npm run build
```

### Step 4: Setup Node.js App

1. In Hostinger control panel: `Hosting > Manage > Node.js`
2. Create new Node.js application
3. Set working directory: `/home/your-username/public_html/GKGifts/web`
4. Set startup command: `npm run start`
5. Deploy

---

## 🔐 Domain & SSL Setup

### Verify Domain Points to Hostinger

**If domain is registered with Hostinger:**
- Should be automatic ✅

**If domain is with another registrar:**

1. Get Hostinger nameservers:
   ```
   ns1.hostinger.com
   ns2.hostinger.com
   ns3.hostinger.com
   ns4.hostinger.com
   ```

2. Update at your registrar's DNS settings
3. Wait 24-48 hours for propagation

### Generate Free SSL Certificate

1. In Hostinger: `Hosting > SSL > Free Let's Encrypt SSL`
2. Select domain: **www.gkgifts.store**
3. Click: `Issue Certificate`
4. Wait 5-15 minutes
5. Auto-redirect to HTTPS will be enabled ✅

### Verify SSL Works

```bash
# Check your domain
curl -I https://www.gkgifts.store

# Should return 200 OK with SSL certificate
```

---

## 🌍 DNS Records (If Manual Setup Needed)

Add these records to your DNS provider:

### A Records
```
Type: A
Name: @
Value: [Hostinger-assigned-IP]
TTL: 3600

Type: A
Name: www
Value: [Hostinger-assigned-IP]
TTL: 3600
```

### CNAME Records (Optional)
```
Type: CNAME
Name: www
Value: gkgifts.store
TTL: 3600
```

Get your Hostinger IP from: `Hosting > Manage > IP Address`

---

## 🔌 API Integration Setup

### 1. Configure Environment Variable

Update environment variable in Hostinger:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

Replace `your-api-domain.com` with your actual API URL.

### 2. Enable CORS on Backend

Your backend API must allow cross-origin requests:

```
Access-Control-Allow-Origin: https://www.gkgifts.store
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 3. Test API Connection

After deployment, test in browser console:

```javascript
fetch('https://your-api-domain.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## ✅ Verification Checklist

After deployment, verify everything works:

```
[ ] https://www.gkgifts.store loads successfully
[ ] SSL certificate shows valid (green lock 🔒)
[ ] Home page displays correctly
[ ] Navigation links work (Login, Signup)
[ ] Login page loads and form is responsive
[ ] Signup page loads and form is responsive
[ ] API endpoint can be reached (check console)
[ ] No 404 errors in browser console
[ ] Mobile view is responsive
[ ] All images load correctly
```

---

## 📊 Performance Optimization

### 1. Enable Caching in Hostinger

1. Go to: `Hosting > Cache`
2. Enable:
   - ✅ Browser Caching
   - ✅ Gzip Compression
   - ✅ Cache Static Files

### 2. Monitor Performance

1. Visit: https://pagespeed.web.dev
2. Enter: https://www.gkgifts.store
3. Check Core Web Vitals
4. Target metrics:
   - LCP (Largest Contentful Paint): < 2.5s
   - CLS (Cumulative Layout Shift): < 0.1
   - FID (First Input Delay): < 100ms

### 3. Use CDN (if available in plan)

1. In Hostinger: `Hosting > CDN`
2. Enable CDN for your domain
3. CDN will cache static assets globally

---

## 🐛 Troubleshooting

### Issue: "Application not running" / Error 503

**Solution:**
1. Check startup command: should be `npm run start`
2. Verify Node.js version is 18+: `node --version`
3. Check logs in Hostinger dashboard
4. Restart application
5. Ensure all npm dependencies installed

```bash
# Check logs
cd /home/your-username/public_html
npm run build
npm run start
```

### Issue: "Domain not resolving" / DNS Error

**Solution:**
1. Verify nameservers updated (wait 24-48 hours)
2. Check DNS propagation: https://www.whatsmydns.net
3. Enter domain: www.gkgifts.store
4. All results should show Hostinger IP

```bash
# Test DNS
nslookup www.gkgifts.store
dig www.gkgifts.store
```

### Issue: "Cannot connect to API" / CORS Error

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check API is running and accessible
3. Verify CORS headers on API:
   ```
   Access-Control-Allow-Origin: https://www.gkgifts.store
   ```
4. Test API directly: `curl https://your-api-url/endpoint`

### Issue: "502 Bad Gateway"

**Solution:**
1. Restart Node.js app in Hostinger
2. Check if Node.js app crashed:
   - Hostinger: `Hosting > Node.js > View Logs`
3. Increase Node.js memory allocation (if available)
4. Check disk space: `Hosting > File Manager > Disk Usage`

### Issue: "SSL Certificate won't issue"

**Solution:**
1. Ensure domain DNS is pointing to Hostinger
2. Wait for DNS propagation (up to 48 hours)
3. Try issuing certificate again
4. Contact Hostinger support if still fails

```bash
# Verify DNS is ready
nslookup www.gkgifts.store
# Should return Hostinger IP
```

---

## 📈 Monitoring & Maintenance

### Daily Monitoring

1. **Check Site Uptime**
   - Visit: https://www.gkgifts.store
   - Verify page loads in < 3 seconds

2. **Monitor Errors**
   - Hostinger: `Hosting > Node.js > View Logs`
   - Browser console: F12 > Console tab

3. **Check Performance**
   - Google PageSpeed: https://pagespeed.web.dev
   - Hostinger Analytics: `Hosting > Analytics`

### Weekly Tasks

1. Review error logs in Hostinger
2. Monitor application performance
3. Backup code: `git push origin web-version`
4. Check disk usage in Hostinger

### Monthly Tasks

1. Update dependencies: `npm update`
2. Create Hostinger backup: `Hosting > Backups > Manual Backup`
3. Review Core Web Vitals
4. Monitor SSL certificate expiration (auto-renews)

---

## 🔄 Updating Application

### Via Git (Automatic)

1. Push changes to GitHub:
   ```bash
   cd web
   git add .
   git commit -m "Update description"
   git push origin web-version
   ```

2. Hostinger auto-deploys (if enabled)

### Manual Update

1. SSH into server:
   ```bash
   ssh your-username@gkgifts.store
   cd ~/public_html
   git pull origin web-version
   npm install
   npm run build
   ```

2. Restart app in Hostinger dashboard: `Hosting > Node.js > Restart`

---

## 📞 Support & Resources

### Hostinger Support
- **Website:** https://support.hostinger.com
- **Live Chat:** 24/7 in Hostinger dashboard
- **Email:** support@hostinger.com
- **Phone:** Check control panel for number

### Documentation
- **Next.js:** https://nextjs.org/docs
- **Node.js:** https://nodejs.org/docs
- **Hostinger Guides:** https://support.hostinger.com/en/categories/hosting

### Common URLs
- **Control Panel:** https://hpanel.hostinger.com
- **Domain Management:** https://hpanel.hostinger.com/hosting/manage
- **SSL Certificates:** https://hpanel.hostinger.com/hosting/ssl
- **Node.js Apps:** https://hpanel.hostinger.com/hosting/node-js

---

## 🎉 Deployment Complete!

Once everything is verified, your site will be live at:

### 🚀 **https://www.gkgifts.store**

**Next Steps:**
1. ✅ Test all features (login, signup, API calls)
2. ✅ Share link with team
3. ✅ Monitor performance for 24 hours
4. ✅ Setup Google Analytics (optional)
5. ✅ Configure email notifications (optional)

---

## 📝 Notes

- Keep `web-version` branch updated for easy re-deployment
- Maintain backups of your code in GitHub
- Monitor Hostinger usage metrics monthly
- Plan for scaling if traffic increases
- Document any custom configurations made in Hostinger

**Good luck with your deployment! 🎊**
