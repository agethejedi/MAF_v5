// worker/index.js — MAF AI Tutor + Admin Proxy
// Deployed to: mafv5.agedotcom.workers.dev

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);

    // ── POST /chat — AI Tutor ─────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/chat') {
      let body;
      try { body = await request.json(); }
      catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders(origin) }); }

      const { messages, system, max_tokens } = body;
      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400, headers: corsHeaders(origin) });
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
        if (!res.ok) return new Response(JSON.stringify({ error: data.error?.message || 'Anthropic error' }), { status: res.status, headers: corsHeaders(origin) });
        return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders(origin) });
      } catch(err) {
        return new Response(JSON.stringify({ error: 'Worker error: ' + err.message }), { status: 500, headers: corsHeaders(origin) });
      }
    }

    // ── POST /admin/delete-user — Delete Firebase Auth user ───
    if (request.method === 'POST' && url.pathname === '/admin/delete-user') {
      let body;
      try { body = await request.json(); }
      catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders(origin) }); }

      const { uid, adminUid } = body;
      if (!uid || !adminUid) {
        return new Response(JSON.stringify({ error: 'uid and adminUid required' }), { status: 400, headers: corsHeaders(origin) });
      }

      // Verify admin via Firebase REST API
      try {
        const verifyRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${adminUid}`,
          { headers: { 'Authorization': `Bearer ${await getFirebaseToken(env)}` } }
        );
        const verifyData = await verifyRes.json();
        const role = verifyData.fields?.role?.stringValue;
        if (role !== 'admin') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: corsHeaders(origin) });
        }

        // Delete Firebase Auth user
        const deleteRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts/${uid}:delete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await getFirebaseToken(env)}`
            },
            body: JSON.stringify({})
          }
        );

        if (!deleteRes.ok) {
          const err = await deleteRes.json();
          return new Response(JSON.stringify({ error: err.error?.message || 'Delete failed' }), { status: 500, headers: corsHeaders(origin) });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders(origin) });

      } catch(err) {
        return new Response(JSON.stringify({ error: 'Admin operation failed: ' + err.message }), { status: 500, headers: corsHeaders(origin) });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders(origin) });
  }
};

// Get a Firebase access token using service account credentials
async function getFirebaseToken(env) {
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit'
  };

  const header  = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body    = btoa(JSON.stringify(payload));
  const signing = `${header}.${body}`;

  // Sign with private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
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
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view   = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}
