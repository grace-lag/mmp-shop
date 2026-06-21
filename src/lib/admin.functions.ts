import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    const { data: annonces, error } = await supabase
      .from("annonces")
      .select("id,title,price,city,seller_id,created_at,image_url")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin] list annonces error:", error);
      throw new Error("Internal error");
    }

    const sellerIds = Array.from(new Set((annonces ?? []).map((a: any) => a.seller_id).filter(Boolean)));
    let profiles: any[] = [];
    if (sellerIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id,prenom,nom,email,avatar_url,created_at")
        .in("id", sellerIds);
      profiles = data ?? [];
    }
    const profileMap: Record<string, any> = {};
    for (const p of profiles) profileMap[p.id] = p;

    const enriched = (annonces ?? []).map((a: any) => ({
      ...a,
      seller: a.seller_id ? profileMap[a.seller_id] ?? null : null,
    }));

    return { isAdmin: true, annonces: enriched };
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
