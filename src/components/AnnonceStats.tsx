import { frAuthError } from "@/lib/auth-errors";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, ThumbsUp, MessageCircle } from "lucide-react";
import { toggleLikeAnnonce } from "@/lib/annonces";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CommentDrawer } from "./CommentDrawer";

type Props = {
  annonceId: string;
  views: number;
  likes: number;
};

export function AnnonceStats({ annonceId, views, likes }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);

  const { data: liked } = useQuery({
    queryKey: ["liked", annonceId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("annonce_likes")
        .select("id")
        .eq("annonce_id", annonceId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: commentsCount } = useQuery({
    queryKey: ["comments-count", annonceId],
    queryFn: async () => {
      const { count } = await supabase
        .from("annonce_comments")
        .select("id", { count: "exact", head: true })
        .eq("annonce_id", annonceId);
      return count ?? 0;
    },
  });

  const like = useMutation({
    mutationFn: () => toggleLikeAnnonce(annonceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liked", annonceId] });
      qc.invalidateQueries({ queryKey: ["annonces"] });
      qc.invalidateQueries({ queryKey: ["annonce", annonceId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <div style={{ display: "flex", gap: 12, color: "#64748b", fontSize: "0.85em", margin: "4px 0", alignItems: "center" }}>
        <span title="Vues" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Eye size={16} /> {views}
        </span>
        <button
          type="button"
          title={user ? "J'aime" : "Connecte-toi pour aimer"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!user) {
              toast.error("Connecte-toi pour aimer");
              return;
            }
            like.mutate();
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: liked ? "#2563eb" : "#64748b",
          }}
        >
          <ThumbsUp size={16} fill={liked ? "#2563eb" : "none"} />
          {likes ?? 0}
        </button>
        <button
          type="button"
          title="Commentaires"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCommentsOpen(true);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#64748b",
          }}
        >
          <MessageCircle size={16} /> {commentsCount ?? 0}
        </button>
      </div>
      <CommentDrawer annonceId={annonceId} open={commentsOpen} onClose={() => setCommentsOpen(false)} />
    </>
  );
}

