import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recherche-utilisateur")({
  validateSearch: (s: Record<string, unknown>) => ({ q: (s.q as string) || "" }),
  component: Page,
});

function Page() {
  const sp = Route.useSearch();
  const [q, setQ] = useState(sp.q);
  const { data } = useQuery({
    queryKey: ["user-search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const tokens = q.trim().split(/\s+/).filter((t) => t.length > 0);
      let query = supabase.from("profiles").select("id,prenom,nom,avatar_url");
      for (const t of tokens) {
        const like = `%${t}%`;
        query = query.or(`prenom.ilike.${like},nom.ilike.${like}`);
      }
      const { data } = await query.limit(30);
      return data ?? [];
    },
  });

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Rechercher une personne</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tapez un nom ou un prénom..."
        className="search-input"
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #fed7aa", marginTop: 8 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {q.trim().length < 2 && <p style={{ color: "#64748b" }}>Tapez au moins 2 caractères.</p>}
        {(data ?? []).map((p: any) => {
          const name = [p.prenom, p.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          return (
            <Link key={p.id} to="/vendeur/$id" params={{ id: p.id }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {p.avatar_url ? <img src={p.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <strong>{name}</strong>
            </Link>
          );
        })}
        {q.trim().length >= 2 && data && data.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucun utilisateur trouvé.</p>}
      </div>
    </SiteLayout>
  );
}
