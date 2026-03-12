# gfolio — Google-Themed MERN Portfolio

A production-ready, full-stack portfolio website inspired by the Google Search homepage.
Built with **MongoDB · Express · React · Node.js**, styled with **TailwindCSS**, and animated with **Framer Motion**.

---

## Features

- **Google Search–style landing page** with your name as the logo and an animated autocomplete search bar for navigation
- **Dark / Light mode** (persisted in localStorage, respects OS preference)
- **About** page — bio, skills, education timeline, resume download
- **Projects** page — dynamically loaded from MongoDB, filterable by tech stack
- **Contact** page — validated form that saves to MongoDB and sends email via Nodemailer
- Fully responsive on mobile, tablet, and desktop
- Accessible (keyboard navigation on search bar, ARIA roles)
- Rate-limited, helmet-secured Express API

---

## Project Structure

```
gfolio/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── api/              # Axios API helpers
│   │   ├── components/       # Navbar, ThemeToggle, PageTransition
│   │   ├── context/          # ThemeContext (dark/light mode)
│   │   ├── pages/            # Home, About, Projects, Contact, NotFound
│   │   └── styles/           # Tailwind global CSS
│   ├── public/               # Static assets (avatar.jpg, resume.pdf)
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── server/                   # Node.js + Express backend
│   ├── models/
│   │   ├── Project.js        # Mongoose schema for projects
│   │   └── Contact.js        # Mongoose schema for contact messages
│   ├── routes/
│   │   ├── projects.js       # GET /api/projects
│   │   └── contact.js        # POST /api/contact
│   ├── index.js              # Express app entry point
│   ├── seed.js               # DB seeder script
│   └── .env.example
│
├── package.json              # Root scripts (dev, build, install:all)
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [MongoDB Atlas](https://cloud.mongodb.com) cluster (free tier works)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/gfolio.git
cd gfolio
npm run install:all
```

### 2. Configure environment variables

**Server** — copy the example and fill in your values:

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/gfolio?retryWrites=true&w=majority
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Gmail App Password (not your real password):
# https://myaccount.google.com/apppasswords
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_TO=your_gmail@gmail.com
```

**Client** — create a `.env` file:

```bash
cp client/.env.example client/.env
```

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the database (optional)

```bash
npm run seed
```

This inserts 4 sample projects into MongoDB.

### 4. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/health

---

## Personalisation Checklist

Open the files below and replace the placeholder values:

| File | What to change |
|------|---------------|
| `client/src/pages/Home.jsx` | Your name letters + colors, GitHub/LinkedIn URLs |
| `client/src/pages/About.jsx` | Bio, skills, education/work timeline, photo |
| `client/src/pages/Contact.jsx` | Your social profile URLs, email address |
| `client/public/avatar.jpg` | Add your photo (any format, rename to `avatar.jpg`) |
| `client/public/resume.pdf` | Add your actual resume PDF |
| `server/seed.js` | Your real projects — title, description, tech stack, links |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/projects` | List all projects (sorted by `order`) |
| GET | `/api/projects/featured` | Featured projects only |
| POST | `/api/projects` | Create a project (for seeding/admin) |
| POST | `/api/contact` | Submit a contact form message |

---

## Deployment

### Frontend → Vercel

1. Push to GitHub.
2. Import the repo on [vercel.com](https://vercel.com).
3. Set **Root Directory** to `client`.
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
5. Deploy.

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com).
2. Set **Root Directory** to `server`.
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add all environment variables from `server/.env` (set `NODE_ENV=production` and update `ALLOWED_ORIGINS` to your Vercel URL).
6. Deploy.

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user. Under **Network Access**, allow `0.0.0.0/0` (or restrict to Render IPs).
3. Copy the connection string into `MONGO_URI`.

---

## Email Setup (Gmail)

1. Enable **2-Step Verification** on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Generate a new app password for "Mail".
4. Use that 16-character password as `EMAIL_PASS` — **never** your real password.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Styling | TailwindCSS 3, custom CSS |
| Animations | Framer Motion |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit, express-validator |

---

## License

MIT © Anurag
