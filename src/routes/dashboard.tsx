import { frAuthError } from "@/lib/auth-errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ShortThumb } from "@/components/ShortThumb";
import { supabase } from "@/integrations/supabase/client";
import { deleteAnnonceServerFn } from "@/lib/annonces.functions";
import { formatPrice } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteAnnonceServerFn);
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["dashboard-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("prenom,nom,avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: myAds } = useQuery({
    queryKey: ["my-ads-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("annonces")
        .select("id,title,price,image_url,created_at,views,expires_at")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [tab, setTab] = useState<"ads" | "shorts">("ads");

  const { data: myShorts } = useQuery({
    queryKey: ["my-shorts-list", user?.id],
    enabled: !!user && tab === "shorts",
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("shorts")
        .select("id,title,video_url,thumbnail_url,price,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return null;

  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(" ").trim() || "Mon compte";

  return (
    <SiteLayout activeNav="compte" hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/compte" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>Tableau de bord</h1>
      </div>

      <section style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
        <div style={{ width: 58, height: 58, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", border: "2px solid #fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "0.82rem" }}>Profil</div>
          <strong style={{ color: "#0f172a", fontSize: "1.05rem" }}>{fullName}</strong>
        </div>
      </section>

      <Link to="/poster" className="btn-whatsapp" style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <Plus size={18} /> Nouvelle annonce
      </Link>

      <div style={{ display: "flex", gap: 8, marginTop: 28, marginBottom: 12 }}>
        <button onClick={() => setTab("ads")} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "none", background: tab === "ads" ? "#ea580c" : "#e2e8f0", color: tab === "ads" ? "#fff" : "#0f172a", fontWeight: 700, cursor: "pointer" }}>Mes annonces</button>
        <button onClick={() => setTab("shorts")} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "none", background: tab === "shorts" ? "#ea580c" : "#e2e8f0", color: tab === "shorts" ? "#fff" : "#0f172a", fontWeight: 700, cursor: "pointer" }}>Mes shorts</button>
      </div>

      {tab === "ads" ? (
      <>
      <h2 style={{ marginTop: 8, marginBottom: 12 }}>Mes annonces</h2>
      <div className="product-grid">
        {(myAds ?? []).map((a: any) => {
          const expired = a.expires_at && new Date(a.expires_at) <= new Date();
          return (
            <div key={a.id} className="product-card" style={{ position: "relative" }}>
              <span className="age-badge" style={{ background: expired ? "#dc2626" : "rgba(15,23,42,0.78)" }}>{expired ? "Expirée" : "Active"}</span>
              <Link to="/annonce/$id" params={{ id: a.id }} className="product-link">
                {a.image_url ? <img src={a.image_url} alt={a.title} /> : (
                  <div style={{ height: 160, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>📷</div>
                )}
              </Link>
              <h3>{a.title}</h3>
              <p className="price">{formatPrice(a.price)}</p>
              <div style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: 6 }}>{a.views ?? 0} vues</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link to="/modifier-annonce/$id" params={{ id: a.id }} style={{ flex: 1, background: "#2563eb", color: "#fff", borderRadius: 8, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", fontSize: "0.82rem" }}>
                  <Pencil size={14} /> Modifier
                </Link>
                <button
                  aria-label="Supprimer"
                  onClick={async () => {
                    if (!confirm(`Supprimer l'annonce « ${a.title} » ?`)) return;
                    try {
                      await deleteFn({ data: { id: a.id } });
                      toast.success("Annonce supprimée");
                      qc.invalidateQueries({ queryKey: ["my-ads-list"] });
                    } catch (e: any) {
                      toast.error(e?.message ?? "Échec de suppression");
                    }
                  }}
                  style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: "8px 10px", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {myAds && myAds.length === 0 && <p style={{ color: "#64748b" }}>Vous n'avez pas encore d'annonce.</p>}
      </div>
      </>
      ) : (
      <>
      <h2 style={{ marginTop: 8, marginBottom: 12 }}>Mes shorts</h2>
      <div className="product-grid">
        {(myShorts ?? []).map((s: any) => (
          <div key={s.id} className="product-card" style={{ position: "relative" }}>
            <Link to="/shorts" className="product-link">
              <ShortThumb videoUrl={s.video_url} posterUrl={s.thumbnail_url} alt={s.title ?? "short"} />
            </Link>
            <h3>{s.title || "Sans titre"}</h3>
            {s.price != null && <p className="price">{formatPrice(s.price)}</p>}
            <div style={{ display: "flex", gap: 6 }}>
              <Link to="/modifier-short/$id" params={{ id: s.id }} style={{ flex: 1, background: "#2563eb", color: "#fff", borderRadius: 8, padding: "8px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", fontSize: "0.82rem" }}>
                <Pencil size={14} /> Modifier
              </Link>
              <button
                aria-label="Supprimer"
                onClick={async () => {
                  if (!confirm("Supprimer ce short ?")) return;
                  const { error } = await (supabase as any).from("shorts").delete().eq("id", s.id);
                  if (error) toast.error(error.message);
                  else { toast.success("Short supprimé"); qc.invalidateQueries({ queryKey: ["my-shorts-list"] }); }
                }}
                style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: "8px 10px", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {myShorts && myShorts.length === 0 && <p style={{ color: "#64748b" }}>Vous n'avez pas encore publié de short.</p>}
      </div>
      </>
      )}
    </SiteLayout>
  );
}
