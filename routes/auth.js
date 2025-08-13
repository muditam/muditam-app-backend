// routes/auth.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const http = require('http');
const https = require('https');

const router = express.Router();

const MSG91_KEY = process.env.MSG91_AUTHKEY; // keep this ONLY on the server
if (!MSG91_KEY) {
  console.warn('[auth] Missing MSG91_AUTHKEY in env');
}

// Keep-alive agents for faster calls
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

// SMALL in-memory cache: phone -> { status: 'verified'|'already_verified', ts: Date }
const verifiedCache = new Map();
// TTL in ms for a “recent verified” hit (instant success on re-taps)
const VERIFIED_TTL = 2 * 60 * 1000; // 2 minutes

// Mini helper
const isRecentVerified = (phone) => {
  const rec = verifiedCache.get(phone);
  if (!rec) return false;
  return (Date.now() - rec.ts) < VERIFIED_TTL;
};
const setVerified = (phone, status = 'verified') => {
  verifiedCache.set(phone, { status, ts: Date.now() });
};

// Rate limit (basic): per IP, per route
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
const verifyLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- SEND OTP ----
router.post('/otp/send', sendLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ ok: false, message: 'phone required' });

    // For the test number, fake a "sent" success immediately
    if (phone === '1234567890') {
      return res.json({ ok: true, status: 'sent', test: true });
    }

    const r = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        mobile: `91${phone}`,
        sender: 'MUDITM',
        template_id: '6883510ad6fc0533183824b2',
        otp_length: '6',
        otp_expiry: '120', // give users reasonable time; you used 10s before
      },
      {
        headers: { authkey: MSG91_KEY, 'Content-Type': 'application/json' },
        timeout: 10000, // 10s network timeout
        httpAgent,
        httpsAgent,
        validateStatus: () => true, // handle non-2xx gracefully
      }
    );

    const data = r.data || {};
    const ok = data?.type === 'success';
    if (ok) return res.json({ ok: true, status: 'sent' });

    // Some MSG91 errors still mean OTP can be retried
    return res.status(400).json({
      ok: false,
      message: data?.message || 'otp_send_failed',
      raw: data,
    });
  } catch (e) {
    console.error('MSG91 send error:', e?.response?.data || e.message);
    return res.status(502).json({ ok: false, message: 'otp_send_failed' });
  }
});

// ---- VERIFY OTP ----
router.post('/otp/verify', verifyLimiter, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ ok: false, message: 'phone and otp required' });

    // Short-circuit: if verified very recently in this session, return instantly
    if (isRecentVerified(phone)) {
      const { status } = verifiedCache.get(phone);
      return res.json({ ok: true, status, cached: true });
    }

    // Test number shortcut
    if (phone === '1234567890' && otp === '098765') {
      setVerified(phone, 'verified');
      return res.json({ ok: true, status: 'verified', test: true });
    }

    // Call MSG91
    const r = await axios.get(
      'https://control.msg91.com/api/v5/otp/verify',
      {
        headers: { authkey: MSG91_KEY, 'Content-Type': 'application/json' },
        params: { otp, mobile: `91${phone}` },
        timeout: 10000, // 10s network timeout
        httpAgent,
        httpsAgent,
        validateStatus: () => true,
      }
    );

    const data = r.data || {};
    const message = (data?.message || '').toLowerCase();
    const already = message.includes('already verified');

    if (data?.type === 'success' || already) {
      const status = already ? 'already_verified' : 'verified';
      setVerified(phone, status);
      return res.json({ ok: true, status });
    }

    // Non-success
    return res.status(400).json({
      ok: false,
      message: data?.message || 'invalid_otp',
      raw: data,
    });
  } catch (e) {
    // If MSG91 returns an error that still contains "already verified", accept it
    const msg = (e?.response?.data?.message || e.message || '').toLowerCase();
    const already = msg.includes('already verified');
    if (already) {
      setVerified(req.body?.phone, 'already_verified');
      return res.json({ ok: true, status: 'already_verified' });
    }

    console.error('MSG91 verify error:', e?.response?.data || e.message);
    return res.status(400).json({ ok: false, message: 'verify_failed' });
  }
});

module.exports = router;
