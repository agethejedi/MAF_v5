// worker/index.js — MAF AI Tutor Proxy
// Deployed to: mafv5.agedotcom.workers.dev
//
// Sits between the MAF app and the Anthropic API.
// ANTHROPIC_API_KEY lives here only — never in the browser.
//
// To set the secret:
//   npx wrangler secret put ANTHROPIC_API_KEY
// Then paste your key when prompted.

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Only accept POST to /chat
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/chat') {
      return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400);
    }

    const { messages, system, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return corsResponse(JSON.stringify({ error: 'messages array required' }), 400);
    }

    // Call Anthropic API
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: max_tokens || 400,
          system:     system || 'You are a helpful math tutor for kids.',
          messages,
        }),
      });

      const data = await anthropicRes.json();

      if (!anthropicRes.ok) {
        console.error('Anthropic error:', JSON.stringify(data));
        return corsResponse(
          JSON.stringify({ error: data.error?.message || 'Anthropic API error' }),
          anthropicRes.status
        );
      }

      return corsResponse(JSON.stringify(data), 200);

    } catch (err) {
      console.error('Worker error:', err);
      return corsResponse(JSON.stringify({ error: 'Worker error: ' + err.message }), 500);
    }
  }
};

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type':                 'application/json',
    }
  });
}
