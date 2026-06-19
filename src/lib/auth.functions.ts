import { createServerFn } from "@tanstack/react-start";

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
