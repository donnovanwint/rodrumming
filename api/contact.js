// Vercel serverless function: POST /api/contact
// Sends the "Request a Lesson" form to Rohan via the Resend API.
//
// Required env var: RESEND_API_KEY (set in Vercel Project Settings → Environment Variables,
// and in a local .env file for `vercel dev`).
//
// Optional env vars:
//   CONTACT_TO_EMAIL   — inbox that receives lesson requests (defaults to rohan@rodrumming.com)
//   CONTACT_FROM_EMAIL — verified sender address (defaults to Resend's shared sandbox sender)
//
// NOTE: Until a domain is verified at resend.com/domains, Resend's sandbox sender
// (onboarding@resend.dev) can only deliver to the email address the Resend account
// was signed up with. Set CONTACT_TO_EMAIL to that address for testing, then switch
// it to rohan@rodrumming.com once the domain is verified.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

const LEVEL_LABELS = {
  beginner: 'Complete Beginner',
  'self-taught': 'Self-Taught',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
};

const PLATFORM_LABELS = {
  zoom: 'Zoom',
  'google-meet': 'Google Meet',
  facetime: 'FaceTime',
  other: 'Other'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const level = typeof body.level === 'string' ? body.level : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set.');
    return res.status(500).json({ error: 'Email service is not configured yet.' });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || 'rohan@rodrumming.com';
  const fromEmail = process.env.CONTACT_FROM_EMAIL || 'Rodrumming Website <onboarding@resend.dev>';

  const html = `
    <h2 style="margin:0 0 16px;">New lesson request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Experience level:</strong> ${escapeHtml(LEVEL_LABELS[level] || level || 'Not specified')}</p>
    <p><strong>Preferred video platform:</strong> ${escapeHtml(PLATFORM_LABELS[platform] || platform || 'Not specified')}</p>
    <p><strong>Preferred days/times:</strong> ${escapeHtml(time || 'Not specified')}</p>
    <p><strong>What they want to work on:</strong><br>${escapeHtml(message || 'Not specified').replace(/\n/g, '<br>')}</p>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `New lesson request from ${name}`,
        html
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      return res.status(502).json({ error: 'Could not send the email. Please try again shortly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error sending contact email:', err);
    return res.status(500).json({ error: 'Unexpected error sending the email.' });
  }
};
