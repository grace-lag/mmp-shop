import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side delete with ownership (or admin) verification. RLS provides
// defense-in-depth, but this enforces the check at the app boundary too.
export const deleteAnnonceServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id || !UUID_RE.test(input.id)) throw new Error("Invalid id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: selErr } = await supabase
      .from("annonces")
      .select("seller_id")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("Annonce introuvable");

    let allowed = row.seller_id === userId;
    if (!allowed) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      allowed = !!roleRow;
    }
    if (!allowed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await deleteAnnonceCascade(data.id, supabaseAdmin);
    return { ok: true };
  });

export async function deleteAnnonceCascade(id: string, adminClient: any) {
  const cleanups = [
    adminClient.from("annonce_comments").delete().eq("annonce_id", id),
    adminClient.from("annonce_likes").delete().eq("annonce_id", id),
    adminClient.from("annonce_views").delete().eq("annonce_id", id),
    adminClient.from("favorites").delete().eq("annonce_id", id),
    adminClient.from("orders").delete().eq("annonce_id", id),
    adminClient.from("messages").update({ annonce_id: null }).eq("annonce_id", id),
  ];
  for (const result of await Promise.all(cleanups)) {
    if (result.error) throw new Error(result.error.message);
  }
  const { error } = await adminClient.from("annonces").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
