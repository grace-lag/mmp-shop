import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-side admin gate: verifies the caller has the 'admin' role using has_role()
// before returning admin-scoped data. Client-side state cannot bypass this.
export const getAdminAnnonces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) {
      console.error("[admin] role lookup error:", roleErr);
      throw new Error("Internal error");
    }
    if (!roleRow) throw new Error("Forbidden");

    const { data, error } = await supabase
      .from("annonces")
      .select("id,title,price,city,seller_id,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] list annonces error:", error);
      throw new Error("Internal error");
    }
    return { isAdmin: true, annonces: data ?? [] };
  });

export const adminDeleteAnnonce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!input?.id || !UUID_RE.test(input.id)) throw new Error("Invalid id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) {
      console.error("[admin] role lookup error:", roleErr);
      throw new Error("Internal error");
    }
    if (!roleRow) throw new Error("Forbidden");
    const { error } = await supabase.from("annonces").delete().eq("id", data.id);
    if (error) {
      console.error("[admin] delete annonce error:", error);
      throw new Error("Internal error");
    }
    return { ok: true };
  });
