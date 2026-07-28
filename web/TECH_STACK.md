# 🏗️ GK Gifts - Technology Stack Overview

## 📊 Project Statistics

- **Language Composition:**
  - TypeScript: 59%
  - Python: 31%
  - JavaScript: 5.9%
  - Shell: 4.1%

- **Repository:** ddubey101/GKGifts
- **Platform:** Cross-platform (Mobile + Web)
- **Deployment:** Hostinger
- **Domain:** www.gkgifts.store

---

## 🚀 Frontend - Mobile App (main branch)

### **Core Framework**
- **React Native 0.81.5** - Cross-platform mobile framework
- **Expo 54.0.35** - React Native development platform
- **React 19.1.0** - UI library
- **TypeScript 5.9.3** - Type-safe JavaScript

### **Navigation & Routing**
- **Expo Router 6.0.24** - File-based routing (similar to Next.js)
  - Supports iOS, Android, and Web
  - Deep linking support
  - Type-safe routes

### **State Management & Storage**
- **@react-native-async-storage/async-storage 2.2.0** - Local data persistence
- **Expo Secure Store 15.0.8** - Secure credential storage
- **Cart Store** (custom) - Shopping cart management
- **Auth Provider** (custom) - Authentication state

### **UI Components & Styling**
- **React Native** - Native UI components
- **@gorhom/bottom-sheet 5.2.14** - Bottom sheet modals
- **@expo/vector-icons 15.1.1** - Icon library
- **Expo Blur 15.0.8** - Blur effects
- **Expo Linear Gradient 15.0.8** - Gradient backgrounds
- **StyleSheet** - React Native styling

### **Animations & Gestures**
- **react-native-reanimated 4.1.1** - High-performance animations
- **react-native-gesture-handler 2.28.0** - Touch gesture handling
- **react-native-worklets 0.5.1** - Off-main-thread worklets

### **Images & Media**
- **expo-image 3.0.11** - Optimized image component
- **Expo Web Browser 15.0.11** - In-app browser
- **react-native-webview 13.15.0** - Web content embedding

### **Platform Integration**
- **react-native-safe-area-context 5.6.0** - Safe area support
- **react-native-screens 4.16.0** - Native screen optimization
- **expo-constants 18.0.13** - Platform constants
- **expo-system-ui 6.0.9** - System UI customization
- **expo-status-bar 3.0.9** - Status bar control
- **expo-splash-screen 31.0.13** - Splash screen handling
- **expo-haptics 15.0.8** - Haptic feedback
- **expo-clipboard ~/8.0.8** - Clipboard access
- **expo-font 14.0.12** - Custom fonts
- **expo-symbols 1.0.8** - Symbol rendering
- **expo-linking 8.0.12** - Deep linking

### **Utilities**
- **date-fns 4.1.0** - Date manipulation
- **dayjs 1.11.13** - Lightweight date library
- **react-native-dotenv 3.4.11** - Environment variables
- **react-native-web 0.21.0** - React Native on web

### **Development Tools**
- **TypeScript 5.9.3** - Static type checking
- **ESLint 9.25.0** - Code linting
- **eslint-config-expo 10.0.0** - Expo linting rules
- **@types/react 19.1.10** - React type definitions
- **expo-doctor 1.19.8** - Project health checker

### **Package Manager**
- **Yarn 1.22.22** - Dependency management

### **Code Quality**
- **Strict TypeScript mode** - Enabled for type safety
- **Path aliases:** `@/*` - For clean imports

---

## 🌐 Frontend - Web App (web-version branch)

### **Framework & Runtime**
- **Next.js 14.0.0** - React framework with SSR/SSG
- **React 19.0.0** - UI library
- **React DOM 19.0.0** - DOM rendering
- **TypeScript 5.3.0** - Type safety

### **Styling**
- **CSS Modules** - Component-scoped styling
- **CSS 3** - Modern CSS features
  - Flexbox layouts
  - Grid system
  - Responsive design

### **HTTP Client**
- **Axios 1.6.0** - Promise-based HTTP client

### **Date Handling**
- **date-fns 4.1.0** - Date manipulation utilities

### **Development Tools**
- **TypeScript 5.3.0** - Type checking
- **ESLint 8.0.0** - Code linting
- **eslint-config-next 14.0.0** - Next.js linting
- **@types/react 19.0.0** - React types
- **@types/node 20.0.0** - Node.js types

### **Key Features**
- ✅ File-based routing (app/ directory)
- ✅ API routes support
- ✅ Image optimization
- ✅ CSS-in-JS support
- ✅ Environment variables
- ✅ Production optimization
- ✅ Built-in ESLint

---

## 🔧 Backend (Python)

The project includes Python components (31% of codebase), likely for:
- REST API server
- Business logic
- Database operations
- Authentication services
- Data processing

**Common Python frameworks that might be used:**
- Flask, FastAPI, or Django - Web framework
- SQLAlchemy - ORM
- Pydantic - Data validation
- JWT - Authentication

---

## 🗄️ Database

Based on the architecture, likely uses:
- **PostgreSQL** or **MySQL** - Primary database
- **Redis** - Caching layer (optional)

---

## 🔐 Authentication & Security

### Frontend
- **Expo Secure Store** - Secure token storage
- **JWT Tokens** - Authentication
- **Auth Context** - State management

### Features
- ✅ Login/Signup
- ✅ Secure password storage
- ✅ Token-based auth
- ✅ Protected routes

---

## 📡 API Integration

### Architecture
- **REST API** - Endpoint-based communication
- **CORS** - Cross-origin resource sharing
- **Environment-based URLs** - `NEXT_PUBLIC_API_URL`

### Endpoints (Expected)
- `/auth/login` - User authentication
- `/auth/signup` - Account creation
- `/auth/logout` - Session termination
- `/gifts` - Product listing
- `/cart` - Shopping cart operations
- `/orders` - Order management

---

## 🎨 Design & Branding

### Color Scheme
```
Primary: #E65C00 (Orange)
Secondary: #FFE8DB (Light Orange)
Background: #F9F9F8 (Light Beige)
Text: #1A1A1A (Dark)
Borders: #E8E8E6 (Light Gray)
```

### Typography
- Font Family: System fonts (-apple-system, Segoe UI, Roboto)
- Sizes: 12px, 14px, 16px, 20px, 24px
- Weights: 400 (regular), 500 (medium)

### Responsive Design
- Mobile-first approach
- Breakpoints: 480px, 768px, 1024px+
- Flexbox & Grid layouts

---

## 🚀 Deployment Stack

### Hosting Platform
- **Hostinger** - Web hosting provider
- **Node.js Hosting** - Server runtime
- **Free SSL (Let's Encrypt)** - HTTPS support

### CI/CD
- **Git** - Version control
- **GitHub** - Repository hosting
- **Hostinger Git Integration** - Auto-deployment

### Environment
- **Production:** Node.js 18+
- **Package Manager:** npm/yarn
- **Build Tool:** Next.js built-in webpack
- **Deployment Directory:** `/public_html`

---

## 📦 Build & Compilation

### Mobile App Build Process
```
Source (TypeScript)
    ↓
Babel (JavaScript transformation)
    ↓
Metro Bundler (React Native)
    ↓
Platform-specific
├── iOS (Xcode)
├── Android (Gradle)
└── Web (Webpack)
```

### Web App Build Process
```
Source (TypeScript/React)
    ↓
SWC (Rust-based compiler)
    ↓
Webpack (Bundling)
    ↓
Next.js Optimization
    ↓
.next/ (Production build)
    ↓
Standalone deployment
```

---

## 📊 Performance Optimizations

### Web Version
- ✅ Image optimization (next/image)
- ✅ Code splitting
- ✅ Lazy loading
- ✅ Minification & compression
- ✅ CSS purging
- ✅ Static generation where possible

### Mobile Version
- ✅ Native performance
- ✅ Reanimated for 60fps animations
- ✅ Worklets for off-main-thread computation
- ✅ Image optimization (expo-image)
- ✅ Lazy loading screens

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────┐
│         Frontend (Mobile/Web)               │
│  ┌────────────┬──────────────────────────┐  │
│  │ UI Layer   │ React/React Native       │  │
│  ├────────────┼──────────────────────────┤  │
│  │ State      │ Context/Async Storage    │  │
│  ├────────────┼──────────────────────────┤  │
│  │ Logic      │ Custom Hooks/Services    │  │
│  └────────────┴──────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   │ API Calls (HTTP)
                   ↓
        ┌──────────────────────┐
        │   Backend API        │
        │  (Flask/FastAPI)     │
        ├──────────────────────┤
        │  Authentication      │
        │  Business Logic      │
        │  Data Processing     │
        └──────────────────────┘
                   │
                   ↓
        ┌──────────────────────┐
        │    Database          │
        │  (PostgreSQL/MySQL)  │
        └──────────────────────┘
```

---

## 🔌 Third-party Integrations

### Likely Services
- **Payment Gateway** - For gift purchases
- **Email Service** - For notifications
- **Analytics** - User tracking
- **Cloud Storage** - Product images

---

## 📱 Supported Platforms

| Platform | Version | Status |
|----------|---------|--------|
| **iOS** | 13+ | ✅ Supported |
| **Android** | 5.0+ | ✅ Supported |
| **Web** | All browsers | ✅ Supported (Chrome, Safari, Firefox, Edge) |
| **Tablet** | Any | ✅ Responsive |

---

## 🛠️ Development Tools & Scripts

### Mobile App Scripts
```bash
npm start          # Start dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm run lint       # Linting
```

### Web App Scripts
```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Linting
npm run export     # Static export
```

---

## 🔒 Security Features

1. **Secure Storage**
   - Expo Secure Store for tokens
   - Device-level encryption

2. **Authentication**
   - JWT tokens
   - Token refresh mechanisms
   - Protected routes

3. **Network Security**
   - HTTPS/SSL encryption
   - CORS validation
   - Secure API endpoints

4. **Code Protection**
   - TypeScript for type safety
   - ESLint for code quality
   - Environment variables for secrets

---

## 📈 Scalability Features

- **Modular Architecture** - Separate frontend & backend
- **Async Storage** - Efficient local caching
- **API-driven** - Easy to add new features
- **Responsive Design** - Works on all devices
- **Standalone Deployment** - Independent web app

---

## 🎯 Key Advantages of This Stack

| Aspect | Advantage |
|--------|-----------|
| **Code Reuse** | Share logic between mobile & web |
| **Fast Development** | Both apps from similar codebase |
| **Type Safety** | TypeScript throughout |
| **Performance** | Native performance on mobile, optimized web |
| **Maintainability** | Modern tooling & best practices |
| **Scalability** | Can handle growing user base |
| **Cost** | Free hosting options available |
| **Deployment** | Easy hosting & auto-deployment |

---

## 📚 Technology Summary

```
Frontend:
  ├── Mobile: React Native + Expo (iOS/Android)
  └── Web: Next.js + React (Browser)

Backend:
  └── Python (Flask/FastAPI/Django)

Database:
  └── SQL (PostgreSQL/MySQL)

Deployment:
  ├── Hosting: Hostinger (Node.js)
  ├── SSL: Let's Encrypt (Free)
  ├── VCS: GitHub
  └── Domain: gkgifts.store

Key Libraries:
  ├── React 19.1.0
  ├── TypeScript 5.3.0
  ├── Expo 54.0.35
  ├── Next.js 14.0.0
  └── React Native 0.81.5
```

---

## 🚀 Future Enhancement Possibilities

- [ ] GraphQL API (alternative to REST)
- [ ] WebSocket support (real-time updates)
- [ ] Progressive Web App (PWA)
- [ ] Offline support
- [ ] AI/ML recommendations
- [ ] Third-party integrations
- [ ] Microservices architecture
- [ ] Mobile app store distribution

---

**Last Updated:** 2026-07-24
**Repository:** ddubey101/GKGifts
**Documentation:** web-version branch
