import { frAuthError } from "@/lib/auth-errors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "sonner";

type Props = { sellerId: string; size?: number; showCount?: boolean; interactive?: boolean };

export function SellerRating({ sellerId, size = 18, showCount = true, interactive = true }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [hover, setHover] = useState<number | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["seller-rating-stats", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data } = await supabase.from("seller_ratings").select("rating").eq("seller_id", sellerId);
      const rows = data ?? [];
      const count = rows.length;
      const avg = count ? rows.reduce((s: number, r: any) => s + r.rating, 0) / count : 0;
      return { count, avg };
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["seller-rating-mine", sellerId, user?.id],
    enabled: !!user && !!sellerId && user.id !== sellerId,
    queryFn: async () => {
      const { data } = await supabase.from("seller_ratings").select("rating").eq("seller_id", sellerId).eq("rater_id", user!.id).maybeSingle();
      return data?.rating ?? null;
    },
  });

  const [current, setCurrent] = useState<number>(0);
  useEffect(() => { if (mine != null) setCurrent(mine); }, [mine]);

  const rate = useMutation({
    mutationFn: async (value: number) => {
      if (!user) {
        navigate({ to: "/login" });
        throw new Error("Connecte-toi d'abord");
      }
      if (user.id === sellerId) throw new Error("Tu ne peux pas te noter toi-même.");
      const { error } = await supabase
        .from("seller_ratings")
        .upsert({ seller_id: sellerId, rater_id: user.id, rating: value, updated_at: new Date().toISOString() }, { onConflict: "seller_id,rater_id" });
      if (error) throw error;
      return value;
    },
    onSuccess: (value) => {
      setCurrent(value);
      qc.invalidateQueries({ queryKey: ["seller-rating-stats", sellerId] });
      qc.invalidateQueries({ queryKey: ["seller-rating-mine", sellerId] });
      toast.success("Note enregistrée");
    },
    onError: (e: any) => { if (e?.message !== "Connecte-toi d'abord") toast.error(e.message); },
  });

  const isOwn = user?.id === sellerId;
  const canRate = interactive && !isOwn;
  const avg = stats?.avg ?? 0;
  const displayed = hover ?? (canRate ? current : Math.round(avg));

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "inline-flex", gap: 1 }} onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = displayed >= n;
          return (
            <button
              key={n}
              type="button"
              disabled={!canRate}
              onMouseEnter={() => canRate && setHover(n)}
              onClick={() => canRate && rate.mutate(n)}
              style={{
                background: "none", border: 0, padding: 0, cursor: canRate ? "pointer" : "default",
                color: filled ? "#fbbf24" : "#cbd5e1", fontSize: size, lineHeight: 1,
              }}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            >
              {filled ? "★" : "☆"}
            </button>
          );
        })}
      </div>
      {showCount && (
        <span style={{ fontSize: "0.8em", color: "#64748b" }}>
          {avg ? avg.toFixed(1) : "—"} ({stats?.count ?? 0})
        </span>
      )}
    </div>
  );
}
