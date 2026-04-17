import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export function getUserClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
}

export function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function requireUser(req: Request) {
  const userClient = getUserClient(req);
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return { user: null, error: "No autorizado. Inicia sesión." };
  return { user, error: null };
}
