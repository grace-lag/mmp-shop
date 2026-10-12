import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/messages-non-lus")({ component: Page });

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  const { data: msgs } = useQuery({
    queryKey: ["unread-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("messages")
        .select("id,sender_id,content,created_at")
        .eq("receiver_id", user!.id)
        .is("read_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const m = new Map<string, { last: any; count: number }>();
    for (const x of msgs ?? []) {
      const cur = m.get(x.sender_id);
      if (!cur) m.set(x.sender_id, { last: x, count: 1 });
      else cur.count += 1;
    }
    return Array.from(m.entries());
  }, [msgs]);

  const ids = grouped.map(([id]) => id);
  const { data: profs } = useQuery({
    queryKey: ["unread-profiles", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url").in("id", ids);
      return data ?? [];
    },
  });
  const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

  if (!user) return null;
  return (
    <SiteLayout hideHeader hideFooter>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/apercu" style={{ textDecoration: "none", color: "#0f172a", fontSize: "1.25rem" }}>←</Link>
        <h1 style={{ margin: 0 }}>Messages non lus ({msgs?.length ?? 0})</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {grouped.map(([sid, { last, count }]) => {
          const p: any = pMap.get(sid);
          const name = [p?.prenom, p?.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
          return (
            <Link key={sid} to="/chat" search={{ to: sid }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: "#fff", borderRadius: 12, border: "1px solid #fed7aa", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p?.avatar_url ? <img src={p.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{name}</strong>
                <div style={{ color: "#475569", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last.content}</div>
              </div>
              <span style={{ background: "#16a34a", color: "white", borderRadius: 999, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>{count}</span>
            </Link>
          );
        })}
        {grouped.length === 0 && <p style={{ color: "#64748b", textAlign: "center" }}>Aucun message non lu.</p>}
      </div>
    </SiteLayout>
  );
}
