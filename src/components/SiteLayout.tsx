import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo-marketplace.jpeg";

export function SiteLayout({ children, activeNav, hideHeader, hideFooter }: { children: ReactNode; activeNav?: string; hideHeader?: boolean; hideFooter?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
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

  // Count of distinct conversations (senders) with at least one unread message
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
            <section className="home-options open" style={{ position: "fixed" }}>
              <Link to="/annonces" className="option-card" onClick={() => setMenuOpen(false)}>
                <span>📦</span>
                <div>
                  <h3>Plus d'annonces</h3>
                  <p>Voir toutes les annonces publiées</p>
                </div>
              </Link>
              <Link to="/parametres" className="option-card" onClick={() => setMenuOpen(false)}>
                <span>⚙️</span>
                <div>
                  <h3>Paramètres</h3>
                  <p>Gérer vos préférences et profil</p>
                </div>
              </Link>
              <Link to="/options" className="option-card" onClick={() => setMenuOpen(false)}>
                <span>✨</span>
                <div>
                  <h3>Autres options</h3>
                  <p>Découvrir plus de fonctionnalités</p>
                </div>
              </Link>
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
        <Link to="/" className={`nav-item ${isActive("accueil") ? "active" : ""}`}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Accueil</span>
        </Link>
        <Link to="/categories" className={`nav-item ${isActive("categories", "/categories") ? "active" : ""}`}>
          <span className="nav-icon">🏷️</span>
          <span className="nav-label">Catégories</span>
        </Link>
        <Link to="/poster" className={`nav-item ${isActive("poster", "/poster") ? "active" : ""}`}>
          <span className="nav-icon">➕</span>
          <span className="nav-label">Poster</span>
        </Link>
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
            <p>MaMarketplace est une plateforme de vente et d'achat en ligne au Congo.</p>
          </div>
          <div className="footer-section">
            <h3>📞 Contact</h3>
            <ul>
              <li><a href="tel:+242068286934">📱 +242 06 8286934</a></li>
              <li><a href="mailto:support@mamarketplace.cg">✉️ support@mamarketplace.cg</a></li>
              <li><Link to="/chat">💬 Chat en ligne</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>🔗 Navigation</h3>
            <ul>
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/categories">Catégories</Link></li>
              <li><Link to="/poster">Poster une annonce</Link></li>
              <li><Link to={user ? "/compte" : "/login"}>Mon compte</Link></li>
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
          <p>&copy; 2026 MaMarketplace. Tous droits réservés. | Créé avec ❤️ au Congo</p>
        </div>
      </footer>
      )}
    </>
  );
}
