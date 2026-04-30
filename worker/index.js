// worker/index.js — MAF AI Tutor Proxy
// Deployed to: mafv5.agedotcom.workers.dev

export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '*';

    // CORS preflight — must respond to OPTIONS before anything else
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    // Only accept POST to /chat
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/chat') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(origin)
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders(origin)
      });
    }

    const { messages, system, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: corsHeaders(origin)
      });
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
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Anthropic API error' }),
          { status: anthropicRes.status, headers: corsHeaders(origin) }
        );
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: corsHeaders(origin)
      });

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(JSON.stringify({ error: 'Worker error: ' + err.message }), {
        status: 500,
        headers: corsHeaders(origin)
      });
    }
  }
};

// Reflect the request origin back — allows any Pages/localhost origin
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };
}


