// MAF Worker — Combined single file
// Paste this entire file into the Cloudflare Worker editor

// ── EMAIL TEMPLATES ───────────────────────────────────────────

const FROM_EMAIL = 'MAF <notifications@mathplusfun.app>';
const FROM_DEV   = 'MAF <onboarding@resend.dev>';

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#f5f0e8; margin:0; padding:20px; }
    .wrap { max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08); }
    .header { background:#C9561E; padding:24px 28px; text-align:center; }
    .header h1 { color:#F5EDD8; font-size:28px; margin:0; letter-spacing:-0.5px; }
    .header p  { color:rgba(245,237,216,.7); font-size:14px; margin:4px 0 0; }
    .body { padding:28px; }
    .body h2 { color:#2C1A0E; font-size:20px; margin:0 0 12px; }
    .body p  { color:#5a4030; font-size:15px; line-height:1.6; margin:0 0 14px; }
    .stat-row { display:flex; gap:12px; margin:16px 0; }
    .stat { flex:1; background:#f5f0e8; border-radius:10px; padding:14px; text-align:center; }
    .stat-num { font-size:28px; font-weight:700; color:#C9561E; }
    .stat-lbl { font-size:12px; color:#a08060; margin-top:2px; }
    .highlight { background:#fff3e8; border-left:4px solid #C9561E; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; }
    .btn { display:inline-block; background:#C9561E; color:#F5EDD8; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:700; font-size:15px; margin:8px 0; }
    .footer { background:#f5f0e8; padding:16px 28px; text-align:center; font-size:12px; color:#a08060; }
    .footer a { color:#C9561E; text-decoration:none; }
    .badge { display:inline-block; background:#C9561E; color:#F5EDD8; border-radius:20px; padding:3px 10px; font-size:12px; font-weight:700; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>MAF</h1>
      <p>Math + Fun — by RiskXLabs LLC</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © 2026 RiskXLabs LLC ·
      <a href="https://maf-v5.pages.dev">Open MAF</a> ·
      <a href="https://maf-v5.pages.dev/pages/privacy.html">Privacy Policy</a>
    </div>
  </div>
</body>
</html>`;
}

function rewardEmail({ parentName, childUsername, rewardValue, totalPoints }) {
  return {
    subject: `🎮 ${childUsername} just earned a Robux reward!`,
    html: baseTemplate(`
      <h2>Great news! 🎉</h2>
      <p>Hi ${parentName || 'there'},</p>
      <p><strong>@${childUsername}</strong> hit their points goal and just earned a
      <strong>${rewardValue || 'Robux gift card'}</strong>!</p>
      <div class="highlight">
        <strong>🏆 ${totalPoints} points earned</strong><br>
        <span style="font-size:13px;color:#a08060">Their hard work in math paid off!</span>
      </div>
      <p>The gift card code has been automatically delivered to their account.
      Log in to the parent dashboard to see their progress.</p>
      <a href="https://maf-v5.pages.dev/pages/parent.html" class="btn">View Dashboard →</a>
    `)
  };
}

function milestoneEmail({ parentName, childUsername, currentPoints, threshold, pct }) {
  return {
    subject: `📈 ${childUsername} is ${pct}% of the way to their next reward!`,
    html: baseTemplate(`
      <h2>Almost there! 💪</h2>
      <p>Hi ${parentName || 'there'},</p>
      <p><strong>@${childUsername}</strong> is making great progress toward their next Robux reward!</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-num">${currentPoints}</div><div class="stat-lbl">Points earned</div></div>
        <div class="stat"><div class="stat-num">${threshold}</div><div class="stat-lbl">Goal</div></div>
        <div class="stat"><div class="stat-num">${pct}%</div><div class="stat-lbl">Complete</div></div>
      </div>
      <p>Keep encouraging them — they are ${threshold - currentPoints} points away from their next reward!</p>
      <a href="https://maf-v5.pages.dev/pages/parent.html" class="btn">View Progress →</a>
    `)
  };
}

function weeklyDigestEmail({ parentName, childUsername, stats }) {
  const { accuracy, problemsSolved, weakAreas, streak } = stats;
  const weakList = weakAreas && weakAreas.length
    ? weakAreas.slice(0,3).map(w => `<li>${w.type.replace('_',' ')} — ${w.pct}% accuracy</li>`).join('')
    : '<li>Complete more sessions to see weak areas</li>';
  return {
    subject: `📊 ${childUsername}'s weekly MAF report`,
    html: baseTemplate(`
      <h2>Weekly Report for @${childUsername}</h2>
      <p>Hi ${parentName || 'there'}, here is how ${childUsername} did this week:</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-num">${accuracy || 0}%</div><div class="stat-lbl">Accuracy</div></div>
        <div class="stat"><div class="stat-num">${problemsSolved || 0}</div><div class="stat-lbl">Problems solved</div></div>
        <div class="stat"><div class="stat-num">${streak || 0}</div><div class="stat-lbl">Day streak 🔥</div></div>
      </div>
      ${weakAreas && weakAreas.length ? `
      <div class="highlight">
        <strong>📚 Areas to work on:</strong>
        <ul style="margin:8px 0 0;padding-left:20px;color:#5a4030;font-size:14px">${weakList}</ul>
      </div>` : ''}
      <p>Log in to the parent dashboard to see full details and adjust reward settings.</p>
      <a href="https://maf-v5.pages.dev/pages/parent.html" class="btn">Open Dashboard →</a>
    `)
  };
}

async function sendEmail(env, { to, subject, html }) {
  const from = env.RESEND_API_KEY ? FROM_EMAIL : FROM_DEV;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({ from, to, subject, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend error');
  return data;
}

// ── MAIN WORKER ───────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // POST /chat — AI Tutor
    if (request.method === 'POST' && url.pathname === '/chat') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin); }

      const { messages, system, max_tokens } = body;
      if (!messages || !Array.isArray(messages)) {
        return json({ error: 'messages array required' }, 400, origin);
      }
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: max_tokens || 400,
            system: system || 'You are a helpful math tutor for kids.',
            messages,
          }),
        });
        const data = await res.json();
        if (!res.ok) return json({ error: data.error?.message || 'Anthropic error' }, res.status, origin);
        return json(data, 200, origin);
      } catch(err) {
        return json({ error: 'Worker error: ' + err.message }, 500, origin);
      }
    }

    // POST /notify/reward
    if (request.method === 'POST' && url.pathname === '/notify/reward') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin); }
      const { to, parentName, childUsername, rewardValue, totalPoints } = body;
      if (!to) return json({ error: 'to email required' }, 400, origin);
      try {
        const email = rewardEmail({ parentName, childUsername, rewardValue, totalPoints });
        await sendEmail(env, { to, ...email });
        return json({ ok: true }, 200, origin);
      } catch(e) {
        return json({ error: e.message }, 500, origin);
      }
    }

    // POST /notify/milestone
    if (request.method === 'POST' && url.pathname === '/notify/milestone') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin); }
      const { to, parentName, childUsername, currentPoints, threshold, pct } = body;
      if (!to) return json({ error: 'to email required' }, 400, origin);
      try {
        const email = milestoneEmail({ parentName, childUsername, currentPoints, threshold, pct });
        await sendEmail(env, { to, ...email });
        return json({ ok: true }, 200, origin);
      } catch(e) {
        return json({ error: e.message }, 500, origin);
      }
    }

    // POST /notify/weekly
    if (request.method === 'POST' && url.pathname === '/notify/weekly') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin); }
      const { to, parentName, childUsername, stats } = body;
      if (!to) return json({ error: 'to email required' }, 400, origin);
      try {
        const email = weeklyDigestEmail({ parentName, childUsername, stats });
        await sendEmail(env, { to, ...email });
        return json({ ok: true }, 200, origin);
      } catch(e) {
        return json({ error: e.message }, 500, origin);
      }
    }

    // POST /admin/delete-user
    if (request.method === 'POST' && url.pathname === '/admin/delete-user') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'Invalid JSON' }, 400, origin); }
      const { uid, adminUid } = body;
      if (!uid || !adminUid) return json({ error: 'uid and adminUid required' }, 400, origin);
      try {
        const token = await getFirebaseToken(env);
        const verifyRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${adminUid}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const verifyData = await verifyRes.json();
        const role = verifyData.fields?.role?.stringValue;
        if (role !== 'admin') return json({ error: 'Unauthorized' }, 403, origin);
        const deleteRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts/${uid}:delete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({})
          }
        );
        if (!deleteRes.ok) {
          const err = await deleteRes.json();
          return json({ error: err.error?.message || 'Delete failed' }, 500, origin);
        }
        return json({ ok: true }, 200, origin);
      } catch(err) {
        return json({ error: 'Admin operation failed: ' + err.message }, 500, origin);
      }
    }

    return json({ error: 'Not found' }, 404, origin);
  }
};

// ── HELPERS ───────────────────────────────────────────────────
function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

async function getFirebaseToken(env) {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email, sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit'
  };
  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body    = btoa(JSON.stringify(payload));
  const signing = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signing));
  const jwt = `${signing}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem) {
  const b64    = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view   = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}
