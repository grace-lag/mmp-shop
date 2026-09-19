import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Film,
  Plus,
  MessageCircle,
  User,
  ShoppingBag,
  Briefcase,
  Clock,
  Bell,
  Settings,
  HelpCircle,
  LogIn,
  UserPlus,
  LogOut,
  Crown,
  PackageSearch,

} from "lucide-react";
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

  const IconSize = 22;
  const menuItems: { to: string; label: string; sub: string; Icon: React.ComponentType<any> }[] = [
    { to: "/annonces", label: "Plus d'annonces", sub: "Voir toutes les annonces", Icon: ShoppingBag },
    { to: "/premium", label: "MMP Premium", sub: "Acheter de l'étranger, livré au Congo", Icon: Crown },
    { to: "/offres-emploi", label: "Offre d'emploi", sub: "Trouver ou proposer un emploi", Icon: Briefcase },
    ...(user
      ? [
          { to: "/mes-commandes", label: "Mes commandes", sub: "Suivi de vos commandes Premium", Icon: PackageSearch },
          { to: "/historique", label: "Historique", sub: "Visites & conversations", Icon: Clock },
          { to: "/notifications", label: "Notifications", sub: "Alertes & boutiques suivies", Icon: Bell },
          { to: "/parametres-site", label: "Paramètres", sub: "Réglages du site", Icon: Settings },

        ]
      : [
          { to: "/login", label: "Se connecter", sub: "Accéder à votre compte", Icon: LogIn },
          { to: "/signup", label: "Créer un compte", sub: "Rejoindre MMP Shop", Icon: UserPlus },
        ]),
    { to: "/aide", label: "Aide", sub: "Comment utiliser la plateforme", Icon: HelpCircle },
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
            <img src={logoUrl} alt="MMP Shop logo" className="brand-image" />
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
              <User size={22} color="#fff" strokeWidth={2.2} />
            )}
          </Link>
        </section>
        )}

        {menuOpen && (
          <>
            <div className="menu-overlay active" onClick={() => setMenuOpen(false)} />
            <section className="home-options open menu-flat" style={{ position: "fixed", overflowY: "auto" }}>
              {menuItems.map(({ to, label, sub, Icon }) => (
                <Link key={to} to={to} className="menu-flat-item" onClick={() => setMenuOpen(false)}>
                  <Icon size={22} strokeWidth={1.8} className="menu-flat-icon" />
                  <div className="menu-flat-text">
                    <div className="menu-flat-title">{label}</div>
                    <div className="menu-flat-sub">{sub}</div>
                  </div>
                </Link>
              ))}
              {user && (
                <button
                  className="menu-flat-item menu-flat-item-btn"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                  }}
                >
                  <LogOut size={22} strokeWidth={1.8} className="menu-flat-icon" />
                  <div className="menu-flat-text">
                    <div className="menu-flat-title">Déconnexion</div>
                    <div className="menu-flat-sub">Quitter votre session</div>
                  </div>
                </button>
              )}
            </section>
          </>
        )}

        <main className="container">{children}</main>
      </div>

      <nav className="bottom-nav bottom-nav-pro">
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
          <Home size={IconSize} strokeWidth={isActive("accueil") ? 2.4 : 1.8} className="nav-icon-svg" />
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
          <Film size={IconSize} strokeWidth={isActive("shorts", "/shorts") ? 2.4 : 1.8} className="nav-icon-svg" />
          <span className="nav-label">Shorts</span>
        </Link>
        {path.startsWith("/shorts") ? (
          <Link
            to="/shorts"
            search={{ upload: 1 } as any}
            className="nav-item nav-item-cta"
            aria-label="Publier un short"
          >
            <span className="nav-cta-bubble">
              <Plus size={22} strokeWidth={2.6} />
            </span>
            <span className="nav-label">Short</span>
          </Link>
        ) : (
          <Link to="/poster" className={`nav-item ${isActive("poster", "/poster") ? "active" : ""}`}>
            <Plus size={IconSize} strokeWidth={isActive("poster", "/poster") ? 2.4 : 1.8} className="nav-icon-svg" />
            <span className="nav-label">Poster</span>
          </Link>
        )}
        <Link to="/conversations" className={`nav-item ${isActive("conversations", "/conversations") ? "active" : ""}`}>
          <MessageCircle size={IconSize} strokeWidth={isActive("conversations", "/conversations") ? 2.4 : 1.8} className="nav-icon-svg" />
          <span className="nav-label">Messages</span>
          {unreadCount > 0 && <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Link>
        <Link to={user ? "/compte" : "/login"} className={`nav-item ${isActive("compte", "/compte") ? "active" : ""}`}>
          <User size={IconSize} strokeWidth={isActive("compte", "/compte") ? 2.4 : 1.8} className="nav-icon-svg" />
          <span className="nav-label">Mon compte</span>
        </Link>
      </nav>

      {!hideFooter && (
      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <h3>🏪 À propos</h3>
            <p>MMP Shop — MaMarketplace E-Shop est une plateforme de vente et d'achat en ligne au Congo.</p>
          </div>
          <div className="footer-section">
            <h3>📞 Contact</h3>
            <ul>
              <li><a href="tel:+242064223575">📱 +242 06 422 35 75</a></li>
              <li><a href="mailto:mmpeshop@gmail.com">✉️ mmpeshop@gmail.com</a></li>
              <li><Link to="/chat">💬 Chat en ligne</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>🔗 Navigation</h3>
            <ul>
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/categories">Catégories</Link></li>
              <li><Link to="/poster">Poster une annonce</Link></li>
              <li><Link to="/premium">MMP Premium</Link></li>
              <li><Link to="/premium/achat">Achat pour vous (Alibaba)</Link></li>
              <li><Link to="/recherche-utilisateur">Rechercher une personne</Link></li>
              <li><Link to={user ? "/compte" : "/login"}>Mon compte</Link></li>
              {isAdmin && <li><Link to="/admin">🛡️ Espace administrateur</Link></li>}
              {isAdmin && <li><Link to="/admin/banned-words">🚫 Mots interdits</Link></li>}
              {isAdmin && <li><Link to="/admin/premium">👑 Premium (admin)</Link></li>}
              {isAdmin && <li><Link to="/admin/banniere">🖼️ Barre publicitaire</Link></li>}

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
          <p>&copy; 2026 MMP Shop — MaMarketplace E-Shop. Tous droits réservés. | Créé avec ❤️ au Congo</p>
        </div>
      </footer>
      )}
    </>
  );
}
