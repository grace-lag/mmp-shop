import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "sonner";

export function useFollowersCount(sellerId: string) {
  return useQuery({
    queryKey: ["followers-count", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { count } = await supabase
        .from("seller_followers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId);
      return count ?? 0;
    },
  });
}

export function FollowButton({ sellerId }: { sellerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", sellerId, user?.id],
    enabled: !!user && !!sellerId && user.id !== sellerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_followers")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("follower_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/login" }); throw new Error("auth"); }
      if (user.id === sellerId) throw new Error("auto");
      if (isFollowing) {
        await supabase.from("seller_followers").delete().eq("seller_id", sellerId).eq("follower_id", user.id);
      } else {
        await supabase.from("seller_followers").insert({ seller_id: sellerId, follower_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-following", sellerId] });
      qc.invalidateQueries({ queryKey: ["followers-count", sellerId] });
    },
    onError: (e: any) => { if (e?.message !== "auth" && e?.message !== "auto") toast.error(e.message); },
  });

  if (user?.id === sellerId) return null;

  return (
    <button
      onClick={() => toggle.mutate()}
      className="btn-whatsapp"
      style={{
        background: isFollowing ? "#64748b" : "#15803d",
        padding: "6px 12px",
        fontSize: "0.8rem",
        width: "auto",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {isFollowing ? "✓ Abonné" : "+ Suivre"}
    </button>
  );
}
