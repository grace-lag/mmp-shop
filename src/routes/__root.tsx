import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemeManager } from "@/components/ThemeManager";
import { LanguageManager } from "@/components/LanguageManager";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">La page n'a pas pu charger</h1>
        <p className="mt-2 text-sm text-muted-foreground">Une erreur s'est produite.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Réessayer</button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent">Accueil</a>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://mamarketplacee.shop";
const LOGO_URL = `${SITE_URL}/__l5e/assets-v1/d433cd3f-df72-4d05-94b1-7c56801cf6db/logo-mamarketplace.jpeg`;
const SITE_TITLE = "MMP Shop — MaMarketplace E-Shop | Acheter et vendre au Congo";
const SITE_DESC = "MMP Shop (MaMarketplace E-Shop) : la marketplace n°1 au Congo pour acheter et vendre entre particuliers et boutiques. Annonces, shorts vidéo, boutiques en ligne, paiement local et livraison partout au Congo-Brazzaville.";
const SITE_KEYWORDS = "MMP Shop, MMPShop, MaMarketplace, MaMarketplace E-Shop, marketplace Congo, achat vente Congo, annonces Congo, boutique en ligne Congo, Brazzaville, Pointe-Noire";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESC },
      { name: "keywords", content: SITE_KEYWORDS },
      { name: "application-name", content: "MMP Shop" },
      { name: "apple-mobile-web-app-title", content: "MMP Shop" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#15803d" },

      { property: "og:site_name", content: "MMP Shop — MaMarketplace E-Shop" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESC },
      { property: "og:image", content: LOGO_URL },
      { property: "og:image:alt", content: "Logo MMP Shop — MaMarketplace E-Shop" },
      { property: "og:url", content: SITE_URL },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESC },
      { name: "twitter:image", content: LOGO_URL },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/jpeg", href: LOGO_URL },
      { rel: "apple-touch-icon", href: LOGO_URL },
      { rel: "canonical", href: SITE_URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MMP Shop — MaMarketplace E-Shop",
          alternateName: ["MMP Shop", "MMPShop", "MaMarketplace", "MaMarketplace E-Shop"],
          url: SITE_URL,
          description: SITE_DESC,
          inLanguage: "fr",
          publisher: {
            "@type": "Organization",
            name: "MMP Shop",
            alternateName: "MaMarketplace E-Shop",
            url: SITE_URL,
            logo: { "@type": "ImageObject", url: LOGO_URL },
          },
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/annonces?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeManager />
        <LanguageManager />
        <SplashScreen />
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
