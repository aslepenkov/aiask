# Vue 3 + TypeScript + Vite + Firebase + Netlify Starter Template

A production-ready scaffold template for building modern web applications with **Vue 3**, **TypeScript**, **Vite**, **Firebase (Firestore)**, and continuous deployment worldwide via **Netlify** and **GitHub Actions**.

## 🚀 Features

- ⚡ **Vite 6** — Lightning-fast HMR and optimized build setup.
- 💚 **Vue 3 Composition API** — Reactive, modular UI development with `<script setup>`.
- 📘 **TypeScript** — Type safety and clean project architecture.
- 🔥 **Firebase Firestore** — Real-time Cloud Firestore integration sample (CRUD operations).
- 🌐 **Netlify Ready** — Pre-configured SPA redirects (`netlify.toml`).
- 🤖 **GitHub Actions CI/CD** — Automatic build and worldwide deployment to Netlify on git push.

---

## 🛠️ Project Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Local Development

Start the local Vite development server:

```bash
npm run dev
```

### 4. Build for Production

Type-check and bundle for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 📦 Deploying to Netlify via GitHub Actions CI/CD

This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys your site worldwide on every push or pull request to `main` or `dev`.

### GitHub Repository Secrets Setup

To enable automated deployment, add the following Secrets under your GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):

#### Netlify Credentials:
- `NETLIFY_AUTH_TOKEN`: Personal Access Token generated in Netlify (`User Settings -> Personal Access Tokens`).
- `NETLIFY_SITE_ID`: API ID found in Netlify site settings (`Site configuration -> General -> Site details -> API ID`).

#### Firebase Config (Optional for Production Build):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## 📂 Project Architecture

```text
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD workflow for Netlify build & deploy
├── src/
│   ├── components/
│   │   └── FirestoreDemo.vue # Demo component showcasing Firestore CRUD
│   ├── App.vue             # Root App component
│   ├── firebase.ts         # Firebase App & Firestore initialization
│   ├── main.ts             # App entry point
│   ├── style.css           # Global styles
│   └── vite-env.d.ts       # Vite & Vue type definitions
├── index.html              # HTML entry template
├── netlify.toml            # Netlify build settings & SPA rewrite rules
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

---

## 📜 License

MIT
