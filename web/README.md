# GK Gifts - Web Version

This is the web version of the GK Gifts application built with Next.js.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- A Hostinger account with your domain

## Local Development

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Setup Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your API URL:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm run start
```

## Deployment to Hostinger

See [HOSTINGER_SETUP.md](./HOSTINGER_SETUP.md) for detailed deployment instructions.

### Quick Start

1. Build locally: `npm run build`
2. Upload to Hostinger via FTP or Git
3. Set environment variables in Hostinger control panel
4. Deploy and verify

## Features

- ✅ Authentication (Login/Signup)
- ✅ Responsive design
- ✅ Fast performance with Next.js
- ✅ TypeScript support
- ✅ API integration ready
- ✅ Mobile-friendly UI

## Project Structure

```
web/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   ├── login/          # Login page
│   ├── signup/         # Signup page
│   ├── globals.css     # Global styles
│   └── page.module.css # Page styles
├── public/             # Static assets
├── package.json        # Dependencies
├── next.config.js      # Next.js configuration
└── tsconfig.json       # TypeScript configuration
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (required)
- `NODE_ENV` - Environment (development/production)

## Performance Tips

1. Use Next.js Image optimization
2. Enable static site generation where possible
3. Use API routes for sensitive operations
4. Monitor Core Web Vitals

## Support

For deployment help, see [HOSTINGER_SETUP.md](./HOSTINGER_SETUP.md)
