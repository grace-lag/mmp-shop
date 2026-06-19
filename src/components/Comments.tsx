import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Trash2 } from "lucide-react";
import { addComment, deleteComment, listComments } from "@/lib/annonces";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function Comments({ annonceId }: { annonceId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", annonceId],
    queryFn: () => listComments(annonceId),
  });

  const add = useMutation({
    mutationFn: () => addComment(annonceId, text.trim()),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", annonceId] });
      qc.invalidateQueries({ queryKey: ["comments-count", annonceId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", annonceId] });
      qc.invalidateQueries({ queryKey: ["comments-count", annonceId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section id="commentaires" style={{ marginTop: 32 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1em", fontWeight: 600 }}>
        <MessageCircle size={20} /> Commentaires ({comments?.length ?? 0})
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
        {isLoading && <p>Chargement...</p>}
        {comments && comments.length === 0 && <p style={{ color: "#64748b" }}>Aucun commentaire pour le moment.</p>}
        {(comments ?? []).map((c) => {
          const name = `${c.author?.prenom ?? ""} ${c.author?.nom ?? ""}`.trim() || "Utilisateur";
          return (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {/* Avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#e2e8f0",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {c.author?.avatar_url ? (
                  <img src={c.author.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "👤"
                )}
              </div>
              {/* Bubble */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    background: "#f0f2f5",
                    borderRadius: 18,
                    padding: "10px 14px",
                    display: "inline-block",
                    maxWidth: "100%",
                    wordBreak: "break-word",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.92em", color: "#050505", marginBottom: 2 }}>{name}</div>
                  <div style={{ fontSize: "0.95em", color: "#050505", lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                    {c.content}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, paddingLeft: 6 }}>
                  <span style={{ fontSize: "0.72em", color: "#65676b", fontWeight: 500 }}>
                    {new Date(c.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {user?.id === c.user_id && (
                    <button
                      onClick={() => del.mutate(c.id)}
                      title="Supprimer"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.72em", display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <Trash2 size={12} /> supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              add.mutate();
            }}
            style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#e2e8f0",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="moi" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "👤"
              )}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Écris un commentaire..."
                maxLength={1000}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 20,
                  border: "1px solid #e2e8f0",
                  background: "#f0f2f5",
                  fontFamily: "inherit",
                  fontSize: 15,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!text.trim() || add.isPending}
                style={{
                  padding: "10px 18px",
                  borderRadius: 20,
                  border: "none",
                  background: text.trim() ? "#2563eb" : "#cbd5e1",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: text.trim() ? "pointer" : "not-allowed",
                }}
              >
                Envoyer
              </button>
            </div>
          </form>
        ) : (
          <p style={{ color: "#64748b" }}>
            <Link to="/login">Connecte-toi</Link> pour laisser un commentaire.
          </p>
        )}
      </div>
    </section>
  );
}

