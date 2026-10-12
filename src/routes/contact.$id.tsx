import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquare, LogIn } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/lib/presence";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/contact/$id")({
  head: () => ({ meta: [{ title: "Contacter le vendeur — MMP Shop" }] }),
  component: ContactPage,
});

function ContactPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return (
      <SiteLayout hideFooter>
        <div style={{ maxWidth: 460, margin: "40px auto", textAlign: "center", padding: "0 16px" }}>
          <div style={{ fontSize: 56 }}>🔒</div>
          <h1 style={{ marginTop: 8 }}>Connexion requise</h1>
          <p style={{ color: "#475569", marginBottom: 24 }}>
            Pour contacter ce vendeur, veuillez d'abord vous connecter à votre compte ou en créer un.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <Link to="/login" style={btn("#2563eb")}>
              <LogIn size={20} /> Se connecter
            </Link>
            <Link to="/signup" style={{ ...btn("#e67e22"), background: "#e67e22" }}>
              ✨ Créer un compte
            </Link>
            <Link to="/" style={{ ...btn("#64748b"), background: "white", color: "#0f172a", border: "1px solid #cbd5e1" }}>
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return <ContactContent id={id} user={user} />;
}

function ContactContent({ id, user }: { id: string; user: any }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["contact-profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("public_profiles").select("id,prenom,nom,avatar_url,last_seen_at,account_type,business_name").eq("id", id).maybeSingle();
      if (!data) return null;
      const { data: contact } = await (supabase as any).rpc("get_profile_contact", { _id: id });
      const c = Array.isArray(contact) ? contact[0] : contact;
      return { ...data, tel: c?.tel ?? null, whatsapp: c?.whatsapp ?? null };
    },
  });

  if (isLoading) return <SiteLayout hideFooter><p>Chargement...</p></SiteLayout>;
  if (!profile) return <SiteLayout hideFooter><p>Vendeur introuvable.</p></SiteLayout>;

  const isBiz = (profile as any).account_type === "entreprise";
  const bizName = (profile as any).business_name as string | null;
  const name = (isBiz && bizName) ? bizName : (`${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "Vendeur");
  const online = isOnline((profile as any).last_seen_at);
  const tel = (profile as any).tel as string | null;
  const wa = (profile as any).whatsapp as string | null;

  return (
    <SiteLayout hideFooter>
      <div style={{ maxWidth: 500, margin: "20px auto", textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={name} style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }} />
            : <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, margin: "0 auto" }}>{isBiz ? "🏢" : "👤"}</div>}
          <span style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: online ? "#16a34a" : "#9ca3af", border: "3px solid #fff" }} />
        </div>
        <h1 style={{ marginTop: 12, marginBottom: 4 }}>{name}</h1>
        <div style={{ color: online ? "#16a34a" : "#64748b", fontSize: "0.9rem", fontWeight: 600 }}>{online ? "● En ligne" : "○ Hors ligne"}</div>

        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {tel && (
            <a href={`tel:${tel}`} style={btn("#16a34a")}>
              <Phone size={20} /> Appeler le vendeur
            </a>
          )}
          {wa && (
            <a href={`https://wa.me/${wa.replace(/\D/g, "")}`} style={btn("#25D366")}>
              💬 WhatsApp
            </a>
          )}
          <Link to="/chat" search={{ to: id }} style={btn("#2563eb")}>
            <MessageSquare size={20} /> Message privé
          </Link>
          <Link to="/u/$id" params={{ id }} style={{ ...btn("#64748b"), background: "white", color: "#0f172a", border: "1px solid #cbd5e1" }}>
            👤 Voir le profil
          </Link>
          {!tel && !wa && <p style={{ color: "#64748b" }}>Aucun numéro de téléphone disponible.</p>}
        </div>
      </div>
    </SiteLayout>
  );
}

function btn(bg: string): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: bg, color: "#fff", padding: "14px 18px", borderRadius: 10, textDecoration: "none", fontWeight: 700, border: "none", fontSize: "1rem" };
}
