import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfile = async (s: Session | null) => {
      if (!s?.user) return;
      const u = s.user;
      const meta: any = u.user_metadata ?? {};
      const fullName: string = meta.full_name ?? meta.name ?? "";
      const [firstFromName, ...restFromName] = fullName.trim().split(/\s+/);
      const prenom = meta.prenom || meta.given_name || firstFromName || "";
      const nom = meta.nom || meta.family_name || restFromName.join(" ") || "";
      const avatar_url = meta.avatar_url || meta.picture || null;
      const tel = meta.tel || u.phone || "";
      const whatsapp = meta.whatsapp || "";
      const { data: existing } = await (supabase as any)
        .from("profiles")
        .select("nom, prenom, avatar_url, tel, whatsapp")
        .eq("id", u.id)
        .maybeSingle();
      const patch: Record<string, any> = { id: u.id };
      if (!existing?.nom && nom) patch.nom = nom;
      if (!existing?.prenom && prenom) patch.prenom = prenom;
      if (!existing?.avatar_url && avatar_url) patch.avatar_url = avatar_url;
      if (!existing?.tel && tel) patch.tel = tel;
      if (!existing?.whatsapp && whatsapp) patch.whatsapp = whatsapp;
      if (Object.keys(patch).length > 1) {
        await (supabase as any).from("profiles").upsert(patch, { onConflict: "id" });
      }
    };

    const ping = () => { void (supabase as any).rpc("touch_last_seen").then(({ error }: any) => { if (error) console.warn("touch_last_seen failed", error); }); };

    // Only signed-in visitors need a presence heartbeat — pinging for anonymous
    // visitors was pure wasted network traffic on slow mobile connections.
    let hasSession = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      hasSession = !!s;
      if (event === "SIGNED_IN") {
        setTimeout(() => { void syncProfile(s); }, 0);
        if (s) ping();
      }
      if (event === "TOKEN_REFRESHED" && s) ping();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      hasSession = !!data.session;
      void syncProfile(data.session);
      if (data.session) ping();
    });
    const pingIfSignedIn = () => { if (hasSession) ping(); };
    const heartbeat = setInterval(pingIfSignedIn, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") pingIfSignedIn();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);



  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
