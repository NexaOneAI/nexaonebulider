/**
 * GitHub OAuth — Step 1: builds the authorize URL for the GitHub OAuth App
 * and returns it. The client opens it in a popup.
 *
 * `state` encodes { user_id, nonce, return_url } and is HMAC-signed with
 * GITHUB_OAUTH_CLIENT_SECRET so the callback can trust it.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';

const SCOPES = ['repo', 'read:user', 'user:email'].join(' ');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user, error } = await requireUser(req);
    if (error || !user) return jsonResponse({ error: error || 'No autorizado' }, 401);

    const clientId = Deno.env.get('GITHUB_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return jsonResponse({ error: 'GitHub OAuth no configurado en el servidor' }, 500);
    }

    const { return_url } = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const redirectUri = `${supabaseUrl}/functions/v1/github-oauth-callback`;

    const nonce = crypto.randomUUID();
    const payload = {
      uid: user.id,
      nonce,
      ret: typeof return_url === 'string' ? return_url : '',
      ts: Date.now(),
    };
    const stateRaw = btoa(JSON.stringify(payload));
    const sig = await hmacSign(stateRaw, clientSecret);
    const state = `${stateRaw}.${sig}`;

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', SCOPES);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('allow_signup', 'true');

    return jsonResponse({ url: authorizeUrl.toString() });
  } catch (e) {
    console.error('github-oauth-start error', e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : 'Error desconocido' },
      500,
    );
  }
});

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
