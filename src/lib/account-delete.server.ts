import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function deleteUserAccountData(userId: string) {
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