import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createTemporaryPassword() {
  const values = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(values, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: callerData, error: callerError } =
    await adminClient.auth.getUser(token);

  if (callerError || !callerData.user) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const { data: callerRole, error: roleError } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerData.user.id)
    .maybeSingle();

  if (roleError || callerRole?.role !== "admin") {
    return jsonResponse({ error: "Administrator access is required." }, 403);
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const role = String(body.role || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || !["admin", "staff"].includes(role)) {
    return jsonResponse(
      { error: "Provide a valid email and access level." },
      400,
    );
  }

  const temporaryPassword = createTemporaryPassword();
  const { data: createdUser, error: createUserError } =
    await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    });

  if (createUserError || !createdUser.user) {
    return jsonResponse(
      { error: createUserError?.message || "Unable to create account." },
      400,
    );
  }

  const userId = createdUser.user.id;
  const { error: metadataError } = await adminClient.from("user_roles").insert({
    user_id: userId,
    role,
  });
  const { error: accountError } = metadataError
    ? { error: metadataError }
    : await adminClient.from("staff_accounts").insert({
        user_id: userId,
        email,
        role,
        created_by: callerData.user.id,
      });

  if (accountError) {
    await adminClient.auth.admin.deleteUser(userId);
    return jsonResponse({ error: "Unable to assign account access." }, 500);
  }

  return jsonResponse(
    {
      userId,
      email,
      role,
      temporaryPassword,
    },
    201,
  );
});
