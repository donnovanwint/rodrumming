// Vercel serverless function: POST /api/contact
// Sends the "Schedule a Lesson" form to Rohan via the Resend API.
//
// Required env var: RESEND_API_KEY (set in Vercel Project Settings → Environment Variables,
// and in a local .env file for `vercel dev`).
//
// Optional env vars:
//   CONTACT_TO_EMAIL   — inbox(es) that receive lesson requests (comma-separated for
//                        multiple, e.g. "Rodrumming@outlook.com,someone-else@example.com").
//                        Defaults to Rodrumming@outlook.com.
//   CONTACT_FROM_EMAIL — verified sender address (defaults to Resend's shared sandbox sender)
//
// NOTE: Until a domain is verified at resend.com/domains, Resend's sandbox sender
// (onboarding@resend.dev) can only deliver to the email address the Resend account
// was signed up with — and it validates every recipient, so listing a second address
// here will make the ENTIRE send fail, not just silently skip the invalid one. Keep
// CONTACT_TO_EMAIL to that single testing address until a domain is verified, then
// switch to Rodrumming@outlook.com (optionally with more addresses appended).

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
  teams: 'Microsoft Teams',
  other: 'Other'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};

  // Honeypot — a real visitor never fills this in.
  if (typeof body._gotcha === 'string' && body._gotcha.trim()) {
    return res.status(200).json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const level = typeof body.level === 'string' ? body.level : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const lessonLength = typeof body.lesson_length === 'string' ? body.lesson_length.trim() : '';
  const preferredDays = Array.isArray(body.preferred_days)
    ? body.preferred_days.filter((day) => typeof day === 'string' && day.trim())
    : [];
  const timeRange = typeof body.time_range === 'string' ? body.time_range.trim() : '';
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

  const toEmails = (process.env.CONTACT_TO_EMAIL || 'Rodrumming@outlook.com')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
  const fromEmail = process.env.CONTACT_FROM_EMAIL || 'Rodrumming Website <onboarding@resend.dev>';

  const html = `
    <h2 style="margin:0 0 16px;">New lesson request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p>
    <p><strong>Experience level:</strong> ${escapeHtml(LEVEL_LABELS[level] || level || 'Not specified')}</p>
    <p><strong>Preferred video platform:</strong> ${escapeHtml(PLATFORM_LABELS[platform] || platform || 'Not specified')}</p>
    <p><strong>Preferred lesson length:</strong> ${escapeHtml(lessonLength || 'Not specified')}</p>
    <p><strong>Preferred days:</strong> ${escapeHtml(preferredDays.length ? preferredDays.join(', ') : 'Not specified')}</p>
    <p><strong>Best time range:</strong> ${escapeHtml(timeRange || 'Not specified')}</p>
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
        to: toEmails,
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
