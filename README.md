# WebCraft 🌐

A professional, single-page web developer portfolio built to attract and convert clients. Features animated particle background, service cards with modals, contact & order forms with real email delivery, and a Node.js/Express backend deployable on Vercel.

![WebCraft Preview](https://img.shields.io/badge/Status-Live-99FFCC?style=flat-square&labelColor=1e1e1e)
![Node](https://img.shields.io/badge/Node.js-18+-99FFCC?style=flat-square&labelColor=1e1e1e)
![License](https://img.shields.io/badge/License-MIT-99FFCC?style=flat-square&labelColor=1e1e1e)

---

## ✨ Features

- Animated canvas particle background with mouse interaction
- Smooth scroll navigation with active section highlighting
- Services section with modal feature breakdowns
- Website types (Kinds) showcase with preview modals
- Order form with service pre-selection from service cards
- Contact & order forms with real email delivery via Gmail SMTP
- Email address validation via Abstract API
- Fully responsive — mobile, tablet, desktop
- Serverless-ready — deploys to Vercel out of the box

## 🗂 Project Structure

```
webcraft/
├── index.html              # Frontend — full single-page site
├── styles.css              # All styles (dark theme, #1E1E1E / #99FFCC)
├── script.js               # Frontend JS — animations, modals, forms
├── server.js               # Local Express server (for running locally)
├── api/
│   ├── send-contact.js     # Vercel serverless function — contact form
│   └── send-order.js       # Vercel serverless function — order form
├── vercel.json             # Vercel deployment configuration
├── package.json
├── .env.example            # Environment variable template
└── .gitignore
```

## 🚀 Quick Start (Local)

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/webcraft.git
cd webcraft
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
# Copy the template
cp .env.example .env

# Open .env and fill in your values
```

Required variables in `.env`:
```
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
ADMIN_EMAIL=yourgmail@gmail.com
ABSTRACT_API_KEY=your_key_here
FRONTEND_ORIGIN=http://localhost:3000
```

**4. Run**
```bash
npm start
# → http://localhost:3000
```

## ☁️ Deploy to Vercel

See the full deployment guide in [DEPLOYMENT.md](./DEPLOYMENT.md).

Short version:
1. Push to GitHub
2. Import project on vercel.com
3. Add environment variables in Vercel dashboard
4. Deploy — done

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js, Express |
| Email | Nodemailer + Gmail SMTP |
| Validation | Abstract API (free tier) |
| Deployment | Vercel (serverless) |
| Fonts | Clash Display, DM Sans |

## 📧 Email Setup

This project uses **Gmail SMTP** (free) for sending emails and **Abstract API** (free, 100/month) for email validation.

- Gmail App Password guide: https://myaccount.google.com/apppasswords
- Abstract API signup: https://www.abstractapi.com/api/email-verification-validation-api

## 📄 License

MIT — use this freely for your own portfolio.
