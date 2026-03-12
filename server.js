/* ================================================================
   WebCraft – server.js
   Express backend for contact & order form handling.

   FREE services used (zero cost, no credit card):
   ─ Nodemailer + Gmail SMTP  → sends emails
   ─ Abstract API (free tier) → validates email addresses
   ================================================================ */

require('dotenv').config();
const express     = require('express');
const nodemailer  = require('nodemailer');
const rateLimit   = require('express-rate-limit');
const cors        = require('cors');
const path        = require('path');
const https       = require('https');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ================================================================
   MIDDLEWARE
   ================================================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Serve static frontend files (index.html, styles.css, script.js) */
app.use(express.static(path.join(__dirname)));

/* CORS – only allow your own frontend origin */
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
}));

/* Rate limiting – prevent spam/abuse */
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait 15 minutes and try again.' },
});

/* ================================================================
   EMAIL TRANSPORTER (Gmail)
   ================================================================ */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,               // SSL on port 465 — most reliable for Gmail
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  debug: true,                // logs full SMTP conversation to terminal
  logger: true,               // shows nodemailer logs
});

/* Verify connection at startup */
transporter.verify((err, success) => {
  if (err) {
    console.error('\n❌ EMAIL TRANSPORTER FAILED:', err.message);
    console.error('   Full error:', JSON.stringify(err, null, 2));
    console.error('   → Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    console.error('   → Make sure 2-Step Verification is ON in your Google account');
    console.error('   → Make sure you used an App Password (not your real password)\n');
  } else {
    console.log('\n✅ Email transporter ready — Gmail SMTP connected successfully.\n');
  }
});

/* ================================================================
   EMAIL VALIDATION via Abstract API (free tier)
   https://www.abstractapi.com/api/email-verification-validation-api
   Free plan: 100 validations / month — perfect for a portfolio site.
   ================================================================ */
function validateEmailWithAPI(email) {
  return new Promise((resolve) => {
    const apiKey = process.env.ABSTRACT_API_KEY;

    /* Regex check first — always run this regardless of API */
    const regexValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!regexValid) {
      return resolve({ valid: false, reason: 'invalid_format' });
    }

    /* If no API key configured, regex passing is enough */
    if (!apiKey || apiKey === 'your_abstract_api_key_here') {
      console.log('ℹ️  No ABSTRACT_API_KEY — regex passed, allowing submission.');
      return resolve({ valid: true, reason: 'regex_pass' });
    }

    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email.trim())}`;
    console.log(`🔍 Validating email via Abstract API: ${email}`);

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('📋 Abstract API raw response:', JSON.stringify(json));

          /* If API returns an error object (quota exceeded, bad key, etc.) — fail open */
          if (json.error || json.message) {
            console.warn('⚠️  Abstract API returned an error:', json.error || json.message);
            console.warn('   Failing open — allowing submission based on regex pass.');
            return resolve({ valid: true, reason: 'api_error_failopen' });
          }

          /* Only block if BOTH format is bad AND deliverability is explicitly UNDELIVERABLE */
          /* Everything else (UNKNOWN, missing fields, partial responses) → allow through */
          const formatOk      = json.is_valid_format?.value !== false; // allow unless explicitly false
          const deliverable   = json.deliverability !== 'UNDELIVERABLE'; // allow DELIVERABLE + UNKNOWN
          const notDisposable = json.is_disposable_email?.value !== true;

          console.log(`   format_ok=${formatOk}, deliverable=${deliverable}, not_disposable=${notDisposable}`);
          console.log(`   deliverability="${json.deliverability}", is_valid_format="${json.is_valid_format?.value}"`);

          if (!formatOk) {
            return resolve({ valid: false, reason: 'invalid_format' });
          }
          if (!notDisposable) {
            return resolve({ valid: false, reason: 'disposable_email' });
          }
          if (!deliverable) {
            return resolve({ valid: false, reason: 'undeliverable' });
          }
          resolve({ valid: true, reason: 'ok' });

        } catch (parseErr) {
          console.warn('⚠️  Abstract API response could not be parsed:', parseErr.message);
          console.warn('   Raw response was:', data);
          /* Fail open — regex already passed */
          resolve({ valid: true, reason: 'api_parse_error' });
        }
      });
    }).on('error', (netErr) => {
      console.warn('⚠️  Abstract API network error:', netErr.message, '— failing open.');
      resolve({ valid: true, reason: 'api_network_error' });
    });
  });
}

/* ================================================================
   HELPERS – Email templates
   ================================================================ */

/* Shared CSS for all emails */
const emailCSS = `
  body { margin:0; padding:0; background:#f4f4f4; font-family: 'Segoe UI', Arial, sans-serif; }
  .wrapper { max-width:600px; margin:32px auto; background:#1e1e1e; border-radius:12px; overflow:hidden; }
  .header { background:#1e1e1e; padding:32px 36px 24px; border-bottom:1px solid #2d2d2d; }
  .header h1 { margin:0; font-size:22px; color:#99FFCC; letter-spacing:-0.02em; }
  .header p { margin:6px 0 0; font-size:13px; color:#888; }
  .body { padding:28px 36px; }
  .body p { margin:0 0 14px; font-size:15px; color:#cccccc; line-height:1.65; }
  .field { margin-bottom:20px; }
  .field .label { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#99FFCC; margin-bottom:4px; }
  .field .value { font-size:14px; color:#e8e8e8; background:#252525; padding:10px 14px; border-radius:6px; border-left:3px solid #99FFCC; white-space:pre-wrap; word-break:break-word; }
  .footer { background:#181818; padding:20px 36px; text-align:center; }
  .footer p { margin:0; font-size:12px; color:#555; }
  .footer a { color:#99FFCC; text-decoration:none; }
  .btn { display:inline-block; margin:16px 0 0; padding:12px 28px; background:#99FFCC; color:#0f1a14; font-size:14px; font-weight:700; border-radius:8px; text-decoration:none; }
`;

function buildAdminContactEmail({ name, email, subject, message }) {
  return {
    subject: `[WebCraft] New Contact: ${subject || 'General Inquiry'} — ${name}`,
    html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
      <div class="wrapper">
        <div class="header">
          <h1>📬 New Contact Message</h1>
          <p>Received via WebCraft contact form</p>
        </div>
        <div class="body">
          <div class="field"><div class="label">From</div><div class="value">${escHtml(name)}</div></div>
          <div class="field"><div class="label">Email</div><div class="value">${escHtml(email)}</div></div>
          <div class="field"><div class="label">Subject</div><div class="value">${escHtml(subject || 'General Inquiry')}</div></div>
          <div class="field"><div class="label">Message</div><div class="value">${escHtml(message)}</div></div>
          <a class="btn" href="mailto:${escHtml(email)}?subject=Re: ${encodeURIComponent(subject || 'Your Inquiry')}">Reply to ${escHtml(name)}</a>
        </div>
        <div class="footer"><p>WebCraft · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
      </div>
    </body></html>`,
  };
}

function buildCustomerContactEmail({ name, subject }) {
  return {
    subject: `We received your message — WebCraft`,
    html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
      <div class="wrapper">
        <div class="header">
          <h1>Thanks, ${escHtml(name)}! 👋</h1>
          <p>Your message has been received.</p>
        </div>
        <div class="body">
          <p>Hi ${escHtml(name)},</p>
          <p>Thanks for reaching out! I've received your message about <strong style="color:#99FFCC">"${escHtml(subject || 'General Inquiry')}"</strong> and will get back to you within <strong style="color:#99FFCC">24 hours</strong>.</p>
          <p>While you wait, feel free to check out my portfolio or browse the services I offer.</p>
          <a class="btn" href="${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}#services">Browse Services →</a>
        </div>
        <div class="footer"><p>WebCraft · Built with ❤️ · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
      </div>
    </body></html>`,
  };
}

function buildAdminOrderEmail({ name, email, service, quantity, description, timeline }) {
  return {
    subject: `[WebCraft] 🛒 New Order: ${service} — ${name}`,
    html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
      <div class="wrapper">
        <div class="header">
          <h1>🛒 New Order Received</h1>
          <p>A client has submitted an order via WebCraft</p>
        </div>
        <div class="body">
          <div class="field"><div class="label">Client Name</div><div class="value">${escHtml(name)}</div></div>
          <div class="field"><div class="label">Email</div><div class="value">${escHtml(email)}</div></div>
          <div class="field"><div class="label">Service Requested</div><div class="value">${escHtml(service)}</div></div>
          <div class="field"><div class="label">Quantity</div><div class="value">${escHtml(String(quantity || 1))}</div></div>
          <div class="field"><div class="label">Timeline</div><div class="value">${escHtml(timeline || 'Not specified')}</div></div>
          <div class="field"><div class="label">Project Description</div><div class="value">${escHtml(description || 'Not provided')}</div></div>
          <a class="btn" href="mailto:${escHtml(email)}?subject=Re: Your ${encodeURIComponent(service)} Order">Reply to ${escHtml(name)}</a>
        </div>
        <div class="footer"><p>WebCraft · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
      </div>
    </body></html>`,
  };
}

function buildCustomerOrderEmail({ name, service, timeline }) {
  const timelineText = {
    asap: 'ASAP',
    '1-2weeks': '1–2 Weeks',
    '3-4weeks': '3–4 Weeks',
    '1-3months': '1–3 Months',
  }[timeline] || 'To be discussed';

  return {
    subject: `Order confirmed — ${service} | WebCraft`,
    html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
      <div class="wrapper">
        <div class="header">
          <h1>Order Received! 🎉</h1>
          <p>Your project request is in good hands.</p>
        </div>
        <div class="body">
          <p>Hi ${escHtml(name)},</p>
          <p>Your order for <strong style="color:#99FFCC">${escHtml(service)}</strong> has been received and I'll review your project details right away.</p>
          <div class="field"><div class="label">Service</div><div class="value">${escHtml(service)}</div></div>
          <div class="field"><div class="label">Requested Timeline</div><div class="value">${escHtml(timelineText)}</div></div>
          <p style="margin-top:20px">Expect a personalised quote and follow-up from me within <strong style="color:#99FFCC">24 hours</strong>. If you have any urgent questions in the meantime, reply to this email.</p>
          <a class="btn" href="${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}#contact">Send a Quick Message →</a>
        </div>
        <div class="footer"><p>WebCraft · Built with ❤️ · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
      </div>
    </body></html>`,
  };
}

/* Simple HTML escape to prevent XSS in emails */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ================================================================
   ROUTE: POST /send-contact
   ================================================================ */
app.post('/send-contact', formLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    /* ── 1. Basic server-side validation ── */
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    /* ── 2. API email validation ── */
    const validation = await validateEmailWithAPI(email);
    if (!validation.valid) {
      const reasons = {
        invalid_format:   'That email address format is not valid.',
        disposable_email: 'Disposable/temporary email addresses are not accepted.',
        undeliverable:    'That email address appears to be undeliverable. Please use a real email.',
      };
      return res.status(400).json({
        success: false,
        message: reasons[validation.reason] || 'Email address could not be verified.',
      });
    }

    /* ── 3. Send emails ── */
    const adminTemplate    = buildAdminContactEmail({ name, email, subject, message });
    const customerTemplate = buildCustomerContactEmail({ name, subject });

    console.log(`📤 Sending admin notification to: ${process.env.ADMIN_EMAIL}`);
    const adminInfo = await transporter.sendMail({
      from: `"WebCraft Forms" <${process.env.GMAIL_USER}>`,
      to:   process.env.ADMIN_EMAIL,
      ...adminTemplate,
    });
    console.log(`✅ Admin email sent. MessageId: ${adminInfo.messageId}, Response: ${adminInfo.response}`);

    console.log(`📤 Sending confirmation to customer: ${email}`);
    const customerInfo = await transporter.sendMail({
      from: `"WebCraft" <${process.env.GMAIL_USER}>`,
      to:   email,
      ...customerTemplate,
    });
    console.log(`✅ Customer email sent. MessageId: ${customerInfo.messageId}, Response: ${customerInfo.response}`);

    return res.status(200).json({ success: true, message: "Message sent! I'll be in touch within 24 hours." });

  } catch (err) {
    console.error('\n❌ CONTACT FORM EMAIL ERROR:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    console.error('   Response:', err.response);
    console.error('   Full error:', JSON.stringify(err, null, 2), '\n');
    return res.status(500).json({ success: false, message: 'Server error — could not send email. Please try again.' });
  }
});

/* ================================================================
   ROUTE: POST /send-order
   ================================================================ */
app.post('/send-order', formLimiter, async (req, res) => {
  try {
    const { service, name, email, quantity, description, timeline } = req.body;

    /* ── 1. Basic server-side validation ── */
    const validServices = ['Frontend', 'Backend', 'Full-Stack', 'Full-Stack + Admin', 'Maintenance'];
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
    if (!service || !validServices.includes(service)) {
      return res.status(400).json({ success: false, message: 'Please select a valid service.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    /* ── 2. API email validation ── */
    const validation = await validateEmailWithAPI(email);
    if (!validation.valid) {
      const reasons = {
        invalid_format:   'That email address format is not valid.',
        disposable_email: 'Disposable/temporary email addresses are not accepted.',
        undeliverable:    'That email address appears to be undeliverable. Please use a real email.',
      };
      return res.status(400).json({
        success: false,
        message: reasons[validation.reason] || 'Email address could not be verified.',
      });
    }

    /* ── 3. Send emails ── */
    const adminTemplate    = buildAdminOrderEmail({ name, email, service, quantity, description, timeline });
    const customerTemplate = buildCustomerOrderEmail({ name, service, timeline });

    console.log(`📤 Sending order notification to admin: ${process.env.ADMIN_EMAIL}`);
    const adminInfo = await transporter.sendMail({
      from: `"WebCraft Orders" <${process.env.GMAIL_USER}>`,
      to:   process.env.ADMIN_EMAIL,
      ...adminTemplate,
    });
    console.log(`✅ Admin order email sent. MessageId: ${adminInfo.messageId}, Response: ${adminInfo.response}`);

    console.log(`📤 Sending order confirmation to customer: ${email}`);
    const customerInfo = await transporter.sendMail({
      from: `"WebCraft" <${process.env.GMAIL_USER}>`,
      to:   email,
      ...customerTemplate,
    });
    console.log(`✅ Customer order email sent. MessageId: ${customerInfo.messageId}, Response: ${customerInfo.response}`);

    return res.status(200).json({ success: true, message: 'Order submitted! Expect a reply within 24 hours.' });

  } catch (err) {
    console.error('\n❌ ORDER FORM EMAIL ERROR:');
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    console.error('   Response:', err.response);
    console.error('   Full error:', JSON.stringify(err, null, 2), '\n');
    return res.status(500).json({ success: false, message: 'Server error — could not process order. Please try again.' });
  }
});

/* ================================================================
   CATCH-ALL – serve index.html for any unmatched GET route
   ================================================================ */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ================================================================
   START SERVER
   ================================================================ */
app.listen(PORT, () => {
  console.log(`\n🚀 WebCraft server running at http://localhost:${PORT}`);
  console.log(`   Serving frontend from: ${__dirname}`);
  console.log(`   Admin email: ${process.env.ADMIN_EMAIL || '(not set — check .env)'}\n`);
});
