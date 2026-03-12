/* ================================================================
   api/send-order.js  —  Vercel Serverless Function
   Handles POST /send-order
   ================================================================ */

const nodemailer = require('nodemailer');
const https      = require('https');

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmailRegex(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

function validateEmailWithAPI(email) {
  return new Promise((resolve) => {
    if (!isValidEmailRegex(email)) {
      return resolve({ valid: false, reason: 'invalid_format' });
    }
    const apiKey = process.env.ABSTRACT_API_KEY;
    if (!apiKey || apiKey === 'your_abstract_api_key_here') {
      return resolve({ valid: true, reason: 'regex_pass' });
    }
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email.trim())}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error || json.message) return resolve({ valid: true, reason: 'api_error_failopen' });
          const formatOk      = json.is_valid_format?.value !== false;
          const deliverable   = json.deliverability !== 'UNDELIVERABLE';
          const notDisposable = json.is_disposable_email?.value !== true;
          if (!formatOk)      return resolve({ valid: false, reason: 'invalid_format' });
          if (!notDisposable) return resolve({ valid: false, reason: 'disposable_email' });
          if (!deliverable)   return resolve({ valid: false, reason: 'undeliverable' });
          resolve({ valid: true, reason: 'ok' });
        } catch {
          resolve({ valid: true, reason: 'api_parse_error' });
        }
      });
    }).on('error', () => resolve({ valid: true, reason: 'api_network_error' }));
  });
}

const emailCSS = `
  body{margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif}
  .wrapper{max-width:600px;margin:32px auto;background:#1e1e1e;border-radius:12px;overflow:hidden}
  .header{background:#1e1e1e;padding:32px 36px 24px;border-bottom:1px solid #2d2d2d}
  .header h1{margin:0;font-size:22px;color:#99FFCC;letter-spacing:-0.02em}
  .header p{margin:6px 0 0;font-size:13px;color:#888}
  .body{padding:28px 36px}
  .body p{margin:0 0 14px;font-size:15px;color:#cccccc;line-height:1.65}
  .field{margin-bottom:20px}
  .field .label{font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#99FFCC;margin-bottom:4px}
  .field .value{font-size:14px;color:#e8e8e8;background:#252525;padding:10px 14px;border-radius:6px;border-left:3px solid #99FFCC;white-space:pre-wrap;word-break:break-word}
  .footer{background:#181818;padding:20px 36px;text-align:center}
  .footer p{margin:0;font-size:12px;color:#555}
  .footer a{color:#99FFCC;text-decoration:none}
  .btn{display:inline-block;margin:16px 0 0;padding:12px 28px;background:#99FFCC;color:#0f1a14;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none}
`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed.' });

  const { service, name, email, quantity, description, timeline } = req.body || {};

  const validServices = ['Frontend', 'Backend', 'Full-Stack', 'Full-Stack + Admin', 'Maintenance'];
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }
  if (!service || !validServices.includes(service)) {
    return res.status(400).json({ success: false, message: 'Please select a valid service.' });
  }

  const validation = await validateEmailWithAPI(email);
  if (!validation.valid) {
    const reasons = {
      invalid_format:   'That email address format is not valid.',
      disposable_email: 'Disposable/temporary email addresses are not accepted.',
      undeliverable:    'That email address appears undeliverable. Please use a real email.',
    };
    return res.status(400).json({ success: false, message: reasons[validation.reason] || 'Email could not be verified.' });
  }

  const timelineText = {
    asap: 'ASAP', '1-2weeks': '1–2 Weeks',
    '3-4weeks': '3–4 Weeks', '1-3months': '1–3 Months',
  }[timeline] || 'Not specified';

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"WebCraft Orders" <${process.env.GMAIL_USER}>`,
      to:   process.env.ADMIN_EMAIL,
      subject: `[WebCraft] 🛒 New Order: ${service} — ${name}`,
      html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
        <div class="wrapper">
          <div class="header"><h1>🛒 New Order Received</h1><p>A client submitted an order via WebCraft</p></div>
          <div class="body">
            <div class="field"><div class="label">Client Name</div><div class="value">${escHtml(name)}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${escHtml(email)}</div></div>
            <div class="field"><div class="label">Service</div><div class="value">${escHtml(service)}</div></div>
            <div class="field"><div class="label">Quantity</div><div class="value">${escHtml(String(quantity || 1))}</div></div>
            <div class="field"><div class="label">Timeline</div><div class="value">${escHtml(timelineText)}</div></div>
            <div class="field"><div class="label">Project Description</div><div class="value">${escHtml(description || 'Not provided')}</div></div>
            <a class="btn" href="mailto:${escHtml(email)}?subject=Re: Your ${encodeURIComponent(service)} Order">Reply to ${escHtml(name)}</a>
          </div>
          <div class="footer"><p>WebCraft · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
        </div></body></html>`,
    });

    await transporter.sendMail({
      from: `"WebCraft" <${process.env.GMAIL_USER}>`,
      to:   email,
      subject: `Order confirmed — ${service} | WebCraft`,
      html: `<!DOCTYPE html><html><head><style>${emailCSS}</style></head><body>
        <div class="wrapper">
          <div class="header"><h1>Order Received! 🎉</h1><p>Your project request is in good hands.</p></div>
          <div class="body">
            <p>Hi ${escHtml(name)},</p>
            <p>Your order for <strong style="color:#99FFCC">${escHtml(service)}</strong> has been received. I'll review your details and reply within <strong style="color:#99FFCC">24 hours</strong>.</p>
            <div class="field"><div class="label">Service</div><div class="value">${escHtml(service)}</div></div>
            <div class="field"><div class="label">Requested Timeline</div><div class="value">${escHtml(timelineText)}</div></div>
            <a class="btn" href="${process.env.FRONTEND_ORIGIN || 'https://your-site.vercel.app'}#contact">Send a Quick Message →</a>
          </div>
          <div class="footer"><p>WebCraft · <a href="mailto:${process.env.ADMIN_EMAIL}">${process.env.ADMIN_EMAIL}</a></p></div>
        </div></body></html>`,
    });

    return res.status(200).json({ success: true, message: 'Order submitted! Expect a reply within 24 hours.' });
  } catch (err) {
    console.error('Order email error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error — could not process order. Please try again.' });
  }
};
