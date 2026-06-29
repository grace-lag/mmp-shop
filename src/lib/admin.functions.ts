import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      .select("id,seller_id,created_at")
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

    const enriched = sellerIds.map((sellerId) => {
      const sellerAds = (annonces ?? []).filter((a: any) => a.seller_id === sellerId);
      return {
        seller_id: sellerId,
        seller: profileMap[sellerId] ?? null,
        annonces_count: sellerAds.length,
        last_annonce_at: sellerAds[0]?.created_at ?? null,
      };
    });

    return { isAdmin: true, annonces: enriched };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Forbidden");
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,prenom,nom,email,avatar_url,tel,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Internal error");
    const ids = (profiles ?? []).map((p: any) => p.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: ads } = await supabase.from("annonces").select("seller_id").in("seller_id", ids);
      for (const a of (ads ?? []) as any[]) counts[a.seller_id] = (counts[a.seller_id] ?? 0) + 1;
    }
    return { users: (profiles ?? []).map((p: any) => ({ ...p, annonces_count: counts[p.id] ?? 0 })) };
  });

export const adminDeleteAnnonce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || !UUID_RE.test(input.userId)) throw new Error("Invalid id");
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
    if (data.userId === userId) throw new Error("Impossible de supprimer votre propre compte depuis l'administration.");
    const { deleteUserAccountData } = await import("@/lib/account-delete.server");
    await deleteUserAccountData(data.userId);
    return { ok: true };
  });
