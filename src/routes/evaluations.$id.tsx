import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/evaluations/$id")({ component: EvaluationsPage });

function EvaluationsPage() {
  const { id } = Route.useParams();
  const [filter, setFilter] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["evaluations", id],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("seller_ratings")
        .select("rater_id,rating,comment,created_at")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });
      const list = rows ?? [];
      const uids = Array.from(new Set(list.map((r: any) => r.rater_id)));
      let profs: any[] = [];
      if (uids.length) {
        const { data } = await supabase.from("profiles").select("id,prenom,nom,avatar_url").in("id", uids);
        profs = data ?? [];
      }
      const map = new Map(profs.map((p) => [p.id, p]));
      const dist = [0, 0, 0, 0, 0];
      list.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
      const avg = list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : 0;
      return { list: list.map((r: any) => ({ ...r, profile: map.get(r.rater_id) })), dist, avg };
    },
  });

  const total = data?.list.length ?? 0;
  const items = (data?.list ?? []).filter((r: any) => filter == null || r.rating === filter);

  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/apercu" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Évaluations</h1>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #fed7aa", marginTop: 14, display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a" }}>{(data?.avg ?? 0).toFixed(1)}</div>
          <div style={{ color: "#fbbf24", fontSize: "1.1rem" }}>{"★★★★★".slice(0, Math.round(data?.avg ?? 0)).padEnd(5, "☆")}</div>
          <div style={{ color: "#64748b", fontSize: "0.85rem" }}>{total} évaluation(s)</div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map((n) => {
            const c = data?.dist[n - 1] ?? 0;
            const pct = total ? (c / total) * 100 : 0;
            return (
              <button key={n} onClick={() => setFilter(filter === n ? null : n)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: 0, padding: "4px 0", cursor: "pointer", color: filter === n ? "#ea580c" : "inherit" }}>
                <span style={{ width: 14 }}>{n}★</span>
                <div style={{ flex: 1, height: 8, background: "#fed7aa", borderRadius: 999 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#fbbf24", borderRadius: 999 }} />
                </div>
                <span style={{ width: 32, textAlign: "right", fontSize: "0.85rem" }}>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {items.map((r: any, i: number) => {
          const name = [r.profile?.prenom, r.profile?.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          return (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #fed7aa", display: "flex", gap: 10 }}>
              <Link to="/u/$id" params={{ id: r.rater_id }} style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {r.profile?.avatar_url ? <img src={r.profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </Link>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Link to="/u/$id" params={{ id: r.rater_id }} style={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}>{name}</Link>
                  <span style={{ color: "#fbbf24" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p style={{ margin: "6px 0 0", color: "#475569" }}>{r.comment}</p>}
                <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucune évaluation.</p>}
      </div>
    </SiteLayout>
  );
}
