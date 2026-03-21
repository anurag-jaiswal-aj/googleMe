# googleMe — Portfolio

[![CI](https://github.com/anurag-jaiswal-aj/googleMe/actions/workflows/ci.yml/badge.svg)](https://github.com/anurag-jaiswal-aj/googleMe/actions/workflows/ci.yml)

A Google-inspired personal portfolio built with the MERN stack. Every page is styled as a SERP (Search Engine Results Page) — complete with a sticky search bar, knowledge panel, voice search, Google Lens modal, and an AI chat mode.

![Lighthouse](./lighthouse.png)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Email | Resend (primary) / Nodemailer SMTP (fallback) |
| Images | Cloudinary |
| Deployment | Vercel (client) + Render (server) |
| Analytics | Vercel Analytics |
| PWA | vite-plugin-pwa |

---

## Features

- Google SERP UI — search bar, tabs, knowledge panel, sitelinks
- Voice search (Web Speech API) and Google Lens image search modal
- AI chat mode with streaming-style responses
- Live GitHub repo sync — fetches public repos and lets you pin projects via the admin panel
- Medium RSS feed integration
- Contact form with file attachments (Resend + SMTP fallback)
- In-app feedback widget (bug reports, suggestions, compliments)
- Admin panel — edit every piece of content without touching code
- Dark / light mode with system preference detection
- PWA — installable, offline-capable
- Fully responsive — mobile-first design

---

## Project Structure

```
googleMe/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── api/         # Axios instance + all API calls
│   │   ├── components/  # Shared UI components
│   │   ├── config/      # Static link config
│   │   ├── context/     # ThemeContext
│   │   ├── data/        # Static fallback data
│   │   ├── hooks/       # useConfig, useImagesPageEnabled
│   │   └── pages/       # Route-level page components
│   └── public/
├── server/          # Express + MongoDB backend
│   ├── middleware/  # JWT auth middleware
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API route handlers
│   └── utils/       # Shared utilities (emailService)
└── shared/          # projects.json fallback (used when GitHub API is down)
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- A Cloudinary account (free tier)
- A Resend account or Gmail App Password

### 1. Clone and install

```bash
git clone https://github.com/anurag-jaiswal-aj/googleMe.git
cd googleMe
npm run install:all   # installs root + client + server deps
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in `server/.env` — at minimum you need:

```env
MONGO_URI=...
JWT_SECRET=...          # any long random string
ADMIN_PASSWORD_HASH=... # bcrypt hash of your chosen admin password
```

Generate the hash:
```bash
node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"
```

### 3. Run in development

```bash
npm run dev   # starts both client (port 5173) and server (port 5000) concurrently
```

---

## Deployment

### Client → Vercel

1. Import the repo in Vercel, set root directory to `client`
2. Add env var: `VITE_API_URL=https://your-render-app.onrender.com/api`

### Server → Render

1. Create a new Web Service, set root directory to `server`
2. Build command: `npm install`
3. Start command: `node index.js`
4. Add all env vars from `server/.env.example`

---

## Admin Panel

Navigate to `/admin` and enter your admin password. From there you can:

- Edit bio, skills, education, experience, certifications
- Pin/unpin GitHub repos on the Projects page
- Upload and manage gallery images
- Update social links and site config

---

## License

MIT
