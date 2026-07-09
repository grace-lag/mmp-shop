import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/logo-mamarketplace.jpeg.asset.json";
const logoUrl = logoAsset.url;

export function SiteLayout({ children, activeNav, hideHeader, hideFooter }: { children: ReactNode; activeNav?: string; hideHeader?: boolean; hideFooter?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (key: string, p?: string) => activeNav === key || (p && path.startsWith(p));

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-avatar", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url,prenom,nom")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", user!.id)
        .is("read_at", null);
      if (!data) return 0;
      const senders = new Set<string>(data.map((r: any) => r.sender_id));
      return senders.size;
    },
  });

  const menuItems = [
    { to: "/annonces", icon: "🛍️", title: "Plus d'annonces", sub: "Voir toutes les annonces" },
    { to: "/offres-emploi", icon: "💼", title: "Offre d'emploi", sub: "Trouver ou proposer un emploi" },
    ...(user
      ? [
          { to: "/historique", icon: "📋", title: "Historique", sub: "Visites & conversations" },
          { to: "/notifications", icon: "🔔", title: "Notifications", sub: "Alertes & boutiques suivies" },
          { to: "/parametres", icon: "⚙️", title: "Paramètres", sub: "Préférences du compte" },

        ]
      : [
          { to: "/login", icon: "🔑", title: "Se connecter", sub: "Accéder à votre compte" },
          { to: "/signup", icon: "✨", title: "Créer un compte", sub: "Rejoindre MaMarketplace" },
        ]),
    { to: "/aide", icon: "❓", title: "Aide", sub: "Comment utiliser la plateforme" },
  ];


  return (
    <>
      {!hideHeader && <div className="delivery-promo">Acheter congolais, vendre congolais, grandir congolais</div>}
      <div className="page" style={hideHeader ? { paddingTop: 0 } : undefined}>
        {!hideHeader && (
        <section className="top-bar">
          <button
            className="options-icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Ouvrir le menu d'options"
          >
            <span className="burger-line" />
            <span className="burger-line" />
            <span className="burger-line" />
          </button>
          <Link to="/" className="brand-logo" style={{ textDecoration: "none" }}>
            <img src={logoUrl} alt="MaMarketplace logo" className="brand-image" />
            <div>
              <div className="brand-name">MaMarketplace</div>
              <div className="brand-name">E-Shop</div>
            </div>
          </Link>
          <Link to={user ? "/compte" : "/login"} className="cart-link" aria-label="Mon compte">
            {user && myProfile?.avatar_url ? (
              <img
                src={myProfile.avatar_url}
                alt="Mon profil"
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }}
              />
            ) : (
              <span className="cart-icon">👤</span>
            )}
          </Link>

        </section>
        )}

        {menuOpen && (
          <>
            <div className="menu-overlay active" onClick={() => setMenuOpen(false)} />
            <section className="home-options open" style={{ position: "fixed", overflowY: "auto" }}>
              {menuItems.map((m) => (
                <Link key={m.to} to={m.to} className="option-card" onClick={() => setMenuOpen(false)}>
                  <span>{m.icon}</span>
                  <div>
                    <h3>{m.title}</h3>
                    <p>{m.sub}</p>
                  </div>
                </Link>
              ))}
              {user && (
                <button
                  className="option-card"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                  }}
                  style={{ cursor: "pointer", textAlign: "left" }}
                >
                  <span>🚪</span>
                  <div>
                    <h3>Déconnexion</h3>
                    <p>Quitter votre session</p>
                  </div>
                </button>
              )}
            </section>
          </>
        )}

        <main className="container">{children}</main>
      </div>

      <nav className="bottom-nav">
        <Link
          to="/"
          className={`nav-item ${isActive("accueil") ? "active" : ""}`}
          onClick={(e) => {
            if (path === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Accueil</span>
        </Link>
        <Link
          to="/shorts"
          className={`nav-item ${isActive("shorts", "/shorts") ? "active" : ""}`}
          onClick={(e) => {
            if (path.startsWith("/shorts")) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <span className="nav-icon">🎬</span>
          <span className="nav-label">Shorts</span>
        </Link>
        {path.startsWith("/shorts") ? (
          <Link
            to="/shorts"
            search={{ upload: 1 } as any}
            className="nav-item"
            aria-label="Publier un short"
          >
            <span
              className="nav-icon"
              style={{
                background: "linear-gradient(90deg,#00f2ea,#ff0050)",
                color: "#fff",
                borderRadius: 10,
                padding: "2px 10px",
                fontWeight: 900,
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              ＋
            </span>
            <span className="nav-label">Short</span>
          </Link>
        ) : (
          <Link to="/poster" className={`nav-item ${isActive("poster", "/poster") ? "active" : ""}`}>
            <span className="nav-icon">➕</span>
            <span className="nav-label">Poster</span>
          </Link>
        )}
        <Link to="/historique" className={`nav-item ${isActive("historique", "/historique") ? "active" : ""}`}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">Messages</span>
          {unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Link>
        <Link to={user ? "/compte" : "/login"} className={`nav-item ${isActive("compte", "/compte") ? "active" : ""}`}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Mon compte</span>
        </Link>
      </nav>


      {!hideFooter && (
      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <h3>🏪 À propos</h3>
            <p>MaMarketplace E-Shop est une plateforme de vente et d'achat en ligne au Congo.</p>
          </div>
          <div className="footer-section">
            <h3>📞 Contact</h3>
            <ul>
              <li><a href="tel:+242064223575">📱 +242 06 422 35 75</a></li>
              <li><a href="mailto:liyeyegrace@gmail.com">✉️ liyeyegrace@gmail.com</a></li>
              <li><a href="mailto:jhonynguimbi500@gmail.com">✉️ jhonynguimbi500@gmail.com</a></li>
              <li><Link to="/chat">💬 Chat en ligne</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>🔗 Navigation</h3>
            <ul>
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/categories">Catégories</Link></li>
              <li><Link to="/poster">Poster une annonce</Link></li>
              <li><Link to="/recherche-utilisateur">Rechercher une personne</Link></li>
              <li><Link to={user ? "/compte" : "/login"}>Mon compte</Link></li>
              {isAdmin && <li><Link to="/admin">🛡️ Espace administrateur</Link></li>}
              {isAdmin && <li><Link to="/admin/banned-words">🚫 Mots interdits</Link></li>}

            </ul>
          </div>
          <div className="footer-section">
            <h3>📋 Légal</h3>
            <ul>
              <li><Link to="/conditions">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy">Politique de confidentialité</Link></li>
              <li><Link to="/mentions-legales">Mentions légales</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 MaMarketplace E-Shop. Tous droits réservés. | Créé avec ❤️ au Congo</p>
        </div>
      </footer>
      )}
    </>
  );
}
