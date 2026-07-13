import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/admin_/banned-words")({
  head: () => ({ meta: [{ title: "Mots interdits — Admin" }] }),
  component: BannedWordsPage,
});

function BannedWordsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [words, setWords] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data, error } = await (supabase as any).from("banned_words").select("word").order("word");
      if (error) setErr(error.message);
      else setWords((data ?? []).map((r: any) => r.word));
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <SiteLayout>
        <p style={{ marginTop: 20 }}>Accès réservé aux administrateurs. <Link to="/">Retour à l'accueil</Link></p>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Link to="/admin" style={{ textDecoration: "none", color: "#0f172a" }}>←</Link>
        <h1 style={{ margin: 0 }}>🚫 Mots interdits ({words.length})</h1>
      </div>
      <p style={{ color: "#64748b" }}>
        Ces mots sont automatiquement bloqués dans les messages, commentaires, titres d'annonces et de shorts.
      </p>
      {err && <p style={{ color: "#dc2626" }}>{err}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {words.map((w) => (
          <span
            key={w}
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid #fecaca",
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </SiteLayout>
  );
}
