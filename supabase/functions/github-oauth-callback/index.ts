/**
 * GitHub OAuth — Step 2: GitHub redirects the user back here with `code`
 * and the signed `state`. We verify the state, exchange the code for an
 * access token, store it in `user_github_tokens`, and redirect back to
 * the app with `?github=connected`.
 *
 * This endpoint is reached via a top-level browser redirect (not fetch),
 * so it returns HTML with a redirect — never JSON.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/auth.ts';
import { ghGetUser } from '../_shared/github.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const ghError = url.searchParams.get('error');

  const clientId = Deno.env.get('GITHUB_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET');

  const renderResult = (status: 'ok' | 'error', message: string, returnUrl?: string) => {
    const safeReturn = returnUrl && /^https?:\/\//.test(returnUrl) ? returnUrl : '';
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>GitHub · Nexa One</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0e1a;color:#e8eef9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{max-width:420px;padding:32px;border-radius:12px;background:#121826;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.4)}
h1{margin:0 0 12px;font-size:18px}p{margin:0 0 16px;color:#9aa6bd;font-size:14px}
a{color:#60a5fa;text-decoration:none}</style></head>
<body><div class="box">
<h1>${status === 'ok' ? '✅ GitHub conectado' : '❌ Error conectando GitHub'}</h1>
<p>${escapeHtml(message)}</p>
<p>Esta ventana se cerrará en 2 segundos…</p>
${safeReturn ? `<a href="${safeReturn}">Volver a Nexa One</a>` : ''}
</div>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ type: 'nexa-github-oauth', status: '${status}' }, '*');
    }
  } catch (e) {}
  setTimeout(() => {
    ${safeReturn ? `window.location.href = ${JSON.stringify(safeReturn + (safeReturn.includes('?') ? '&' : '?') + 'github=' + status)};` : 'window.close();'}
  }, 1500);
</script>
</body></html>`;
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  };

  if (ghError) return renderResult('error', `GitHub denegó el acceso: ${ghError}`);
  if (!code || !state) return renderResult('error', 'Faltan parámetros code/state');
  if (!clientId || !clientSecret)
    return renderResult('error', 'OAuth no configurado en el servidor');

  // ---- Verify state ----
  const [stateRaw, sig] = state.split('.');
  if (!stateRaw || !sig) return renderResult('error', 'state inválido');
  const expected = await hmacSign(stateRaw, clientSecret);
  if (sig !== expected) return renderResult('error', 'Firma de state inválida');

  let payload: { uid: string; nonce: string; ret: string; ts: number };
  try {
    payload = JSON.parse(atob(stateRaw));
  } catch {
    return renderResult('error', 'state corrupto');
  }
  if (Date.now() - payload.ts > 10 * 60 * 1000) {
    return renderResult('error', 'state expirado, intenta de nuevo', payload.ret);
  }

  // ---- Exchange code for token ----
  let tokenResp: Response;
  try {
    tokenResp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
  } catch (e) {
    return renderResult('error', 'No se pudo contactar a GitHub', payload.ret);
  }

  const tokenData = (await tokenResp.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
    error?: string;
  };
  if (!tokenData.access_token) {
    return renderResult(
      'error',
      tokenData.error_description || tokenData.error || 'No se obtuvo access token',
      payload.ret,
    );
  }

  // ---- Fetch GitHub user info ----
  let ghUser;
  try {
    ghUser = await ghGetUser(tokenData.access_token);
  } catch (e) {
    return renderResult('error', 'Token válido pero no se pudo leer /user', payload.ret);
  }

  // ---- Persist ----
  const admin = getAdminClient();
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const { error: upsertError } = await admin
    .from('user_github_tokens')
    .upsert(
      {
        user_id: payload.uid,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        github_login: ghUser.login,
        github_user_id: ghUser.id,
        github_avatar_url: ghUser.avatar_url,
        scope: tokenData.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    console.error('github-oauth-callback upsert error', upsertError);
    return renderResult('error', 'No se pudo guardar el token', payload.ret);
  }

  return renderResult('ok', `Conectado como @${ghUser.login}`, payload.ret);
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
