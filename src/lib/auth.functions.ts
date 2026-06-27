import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side phone+password sign-in. The caller never receives the email
// address associated with a phone number — the lookup and the password
// verification both happen on the server, and only a session (or a generic
// error) is returned. This prevents phone→email enumeration.
export const signInWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; password: string }) => {
    const raw = String(input?.phone ?? "");
    const digits = raw.replace(/\D+/g, "");
    const password = String(input?.password ?? "");
    if (digits.length < 6 || digits.length > 20) {
      throw new Error("Identifiants incorrects");
    }
    if (password.length < 1 || password.length > 200) {
      throw new Error("Identifiants incorrects");
    }
    return { digits, password };
  })
  .handler(async ({ data }) => {
    const GENERIC = "Identifiants incorrects";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");

    // Look up the matching email server-side.
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("email, tel")
      .not("tel", "is", null)
      .neq("tel", "");
    if (error) throw new Error(GENERIC);
    const match = (rows ?? []).find(
      (r) => (r.tel ?? "").replace(/\D+/g, "") === data.digits,
    );
    if (!match?.email) throw new Error(GENERIC);

    // Verify the password by signing in server-side with a fresh publishable
    // client (no session persistence) so we never expose the email.
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({
      email: match.email,
      password: data.password,
    });
    if (signErr || !signed.session) throw new Error(GENERIC);

    return {
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
    };
  });

export async function deleteUserAccountData(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: ads, error: adsError } = await supabaseAdmin
    .from("annonces")
    .select("id")
    .eq("seller_id", userId);
  if (adsError) throw new Error(adsError.message);
  const adIds = (ads ?? []).map((a: any) => a.id).filter(Boolean);

  if (adIds.length > 0) {
    const byAnnonce = [
      supabaseAdmin.from("annonce_comments").delete().in("annonce_id", adIds),
      supabaseAdmin.from("annonce_likes").delete().in("annonce_id", adIds),
      supabaseAdmin.from("annonce_views").delete().in("annonce_id", adIds),
      supabaseAdmin.from("favorites").delete().in("annonce_id", adIds),
      supabaseAdmin.from("orders").delete().in("annonce_id", adIds),
      supabaseAdmin.from("messages").update({ annonce_id: null }).in("annonce_id", adIds),
    ];
    for (const result of await Promise.all(byAnnonce)) {
      if (result.error) throw new Error(result.error.message);
    }
  }

  const cleanups = [
    supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    supabaseAdmin.from("annonce_comments").delete().eq("user_id", userId),
    supabaseAdmin.from("annonce_likes").delete().eq("user_id", userId),
    supabaseAdmin.from("annonce_views").delete().eq("user_id", userId),
    supabaseAdmin.from("favorites").delete().eq("user_id", userId),
    supabaseAdmin.from("orders").delete().eq("user_id", userId),
    supabaseAdmin.from("seller_followers").delete().or(`seller_id.eq.${userId},follower_id.eq.${userId}`),
    supabaseAdmin.from("seller_ratings").delete().or(`seller_id.eq.${userId},rater_id.eq.${userId}`),
    supabaseAdmin.from("annonces").delete().eq("seller_id", userId),
    supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
    supabaseAdmin.from("profiles").delete().eq("id", userId),
  ];
  for (const result of await Promise.all(cleanups)) {
    if (result.error) throw new Error(result.error.message);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);
}

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await deleteUserAccountData(context.userId);
    return { ok: true };
  });
