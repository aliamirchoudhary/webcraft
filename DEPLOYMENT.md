# Deploying WebCraft to Vercel

Complete step-by-step guide. Takes about 10 minutes.

---

## Part 1 — Push to GitHub

### Step 1 — Install Git (if you don't have it)

Check if you have Git:
```bash
git --version
```
If you see a version number you're good. If not, download from https://git-scm.com and install it.

### Step 2 — Create a GitHub repository

1. Go to **https://github.com** and sign in (or sign up — it's free)
2. Click the **+** button top-right → **New repository**
3. Name it `webcraft` (or whatever you like)
4. Leave it **Public** or set to **Private** — your choice
5. **Do NOT** tick "Add README" or "Add .gitignore" — your project already has these
6. Click **Create repository**
7. GitHub shows you a page with commands. **Keep this page open** — you'll need the repo URL.

### Step 3 — Push your code

Open your terminal in the WebCraft project folder and run these commands **one by one**:

```bash
# 1. Initialise git in your project folder
git init

# 2. Stage all files for commit
git add .

# 3. Make your first commit
git commit -m "Initial commit — WebCraft portfolio"

# 4. Rename the branch to 'main' (GitHub's default)
git branch -M main

# 5. Link your local project to GitHub
#    Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 6. Push to GitHub
git push -u origin main
```

After the last command, refresh your GitHub page — you should see all your files there.

> **Windows tip:** If Git asks for your GitHub username/password, use your username and a Personal Access Token (not your password). Create one at: https://github.com/settings/tokens → Generate new token → tick "repo" → copy the token and use it as the password.

---

## Part 2 — Deploy on Vercel

### Step 1 — Connect Vercel to GitHub

1. Go to **https://vercel.com** and sign in with your GitHub account
2. Click **Add New Project**
3. You'll see a list of your GitHub repositories — find `webcraft` and click **Import**

### Step 2 — Configure the project

On the configuration screen:
- **Framework Preset**: leave as **Other** (Vercel auto-detects from `vercel.json`)
- **Root Directory**: leave as `./ ` (the default)
- **Build & Output Settings**: leave everything blank — `vercel.json` handles it

### Step 3 — Add environment variables

This is the most important step. Click **Environment Variables** and add each one:

| Name | Value |
|---|---|
| `GMAIL_USER` | `yourgmail@gmail.com` |
| `GMAIL_APP_PASSWORD` | `xxxx xxxx xxxx xxxx` |
| `ADMIN_EMAIL` | `yourgmail@gmail.com` |
| `ABSTRACT_API_KEY` | your Abstract API key |
| `FRONTEND_ORIGIN` | leave **blank for now** — you'll update this after first deploy |

Click **Add** after each one. Make sure there are no extra spaces.

### Step 4 — Deploy

Click **Deploy**. Vercel builds and deploys in about 30 seconds.

When it finishes, Vercel gives you a URL like:
```
https://webcraft-abc123.vercel.app
```

### Step 5 — Update FRONTEND_ORIGIN

Now that you have your real URL:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Find `FRONTEND_ORIGIN` and click **Edit**
4. Set the value to your actual Vercel URL, e.g. `https://webcraft-abc123.vercel.app`
5. Click **Save**
6. Go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

This ensures CORS is locked to your real domain.

### Step 6 — Test it live

1. Open your Vercel URL in the browser
2. Submit the contact form with a real email address
3. Check both your admin inbox and the submitted email's inbox
4. Check spam if you don't see it within a minute

---

## Part 3 — Custom Domain (Optional)

If you own a domain (e.g. from Namecheap, GoDaddy, etc.):

1. In your Vercel project → **Settings** → **Domains**
2. Click **Add Domain** and type your domain (e.g. `webcraft.dev`)
3. Vercel shows you DNS records to add — go to your domain registrar and add them
4. Wait 5–30 minutes for DNS to propagate
5. Update `FRONTEND_ORIGIN` in Vercel env vars to your custom domain and redeploy

---

## Updating Your Site Later

Whenever you make changes to your code:

```bash
# Stage your changes
git add .

# Commit with a description of what changed
git commit -m "Update services pricing"

# Push to GitHub
git push
```

Vercel automatically detects the push and redeploys within 30 seconds. No manual steps needed.

---

## Troubleshooting Vercel Deployment

**Forms return 500 error on live site but work locally**
→ Check Vercel environment variables are set correctly (Settings → Environment Variables)
→ In Vercel dashboard go to Functions tab → click a function → view logs for the exact error

**"Function not found" or 404 on form submit**
→ Check `vercel.json` is in your repo root
→ Check the `api/` folder exists with `send-contact.js` and `send-order.js`

**Emails not sending on live site**
→ Go to Vercel dashboard → your project → **Functions** tab
→ Click on `send-contact` or `send-order` → **View Logs**
→ The error message will tell you exactly what's wrong

**CORS error in browser console**
→ Update `FRONTEND_ORIGIN` in Vercel env vars to your exact Vercel URL (no trailing slash)
→ Redeploy after changing env vars
