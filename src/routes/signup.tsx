import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/lib/annonces";
import { PhoneInput } from "@/components/PhoneInput";
import { frAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function ageFromDate(d: string): number {
  if (!d) return 0;
  const birth = new Date(d);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

type AccountType = "personne" | "entreprise";

function SignupPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    nom: "", prenom: "", genre: "", date_naissance: "",
    email: "", tel: "", whatsapp: "", password: "",
    business_name: "", business_year: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const isBiz = accountType === "entreprise";

    if (isBiz) {
      if (!form.business_name.trim() || !form.prenom || !form.nom || !form.email || !form.tel || !form.business_year) {
        return toast.error("Tous les champs sont obligatoires (sauf WhatsApp).");
      }
      const yr = Number(form.business_year);
      if (!Number.isInteger(yr) || yr < 1900 || yr > currentYear) {
        return toast.error(`Année d'existence invalide (entre 1900 et ${currentYear}).`);
      }
    } else {
      if (!form.prenom || !form.nom || !form.genre || !form.date_naissance || !form.email || !form.tel) {
        return toast.error("Tous les champs sont obligatoires (sauf WhatsApp).");
      }
      if (ageFromDate(form.date_naissance) < 16) {
        return toast.error("Pour utiliser MMP Shop, vous devez avoir au moins 16 ans.");
      }
    }
    if (!avatarFile) return toast.error("La photo de profil est obligatoire.");
    if (form.password.length < 1) return toast.error("Choisis un mot de passe.");
    if (!acceptTerms) return toast.error("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.");

    setLoading(true);
    try {
      const meta: Record<string, any> = {
        nom: form.nom, prenom: form.prenom,
        tel: form.tel, whatsapp: form.whatsapp,
        account_type: accountType,
      };
      if (isBiz) {
        meta.business_name = form.business_name;
        meta.business_year = Number(form.business_year);
      } else {
        meta.genre = form.genre;
        meta.date_naissance = form.date_naissance;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: meta },
      });
      if (error) throw error;

      const session = data.session;
      if (!session?.user) {
        throw new Error("Compte créé. Connecte-toi pour finaliser ton profil.");
      }
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      const avatar_url = await uploadAvatar(avatarFile, session.user.id);
      await supabase.auth.updateUser({ data: { ...meta, avatar_url } });

      const profilePayload: Record<string, any> = {
        id: session.user.id,
        email: form.email.trim().toLowerCase(),
        nom: form.nom,
        prenom: form.prenom,
        tel: form.tel,
        whatsapp: form.whatsapp,
        avatar_url,
        account_type: accountType,
        updated_at: new Date().toISOString(),
      };
      if (isBiz) {
        profilePayload.business_name = form.business_name;
        profilePayload.business_year = Number(form.business_year);
      } else {
        profilePayload.genre = form.genre;
        profilePayload.date_naissance = form.date_naissance;
      }

      const { error: profErr } = await (supabase as any)
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });
      if (profErr) throw profErr;

      toast.success("Compte créé !");
      navigate({ to: "/compte" });
    } catch (err: any) {
      toast.error(frAuthError(err) || "Création du compte échouée");
    } finally {
      setLoading(false);
    }
  };

  if (!accountType) {
    return (
      <SiteLayout activeNav="compte">
        <h1 style={{ marginTop: 16 }}>Créer un compte</h1>
        <p style={{ color: "#475569" }}>Quel type de compte voulez-vous créer&nbsp;?</p>
        <div style={{ display: "grid", gap: 12, maxWidth: 420, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setAccountType("personne")}
            style={typeBtn("#f0fdf4", "#15803d")}
          >
            <div style={{ fontSize: 28 }}>👤</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Compte personne</div>
              <div style={{ fontSize: "0.85rem", color: "#475569" }}>Pour un particulier — vendre ou acheter à titre personnel.</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("entreprise")}
            style={typeBtn("#fff7ed", "#ea580c")}
          >
            <div style={{ fontSize: 28 }}>🏢</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Compte entreprise</div>
              <div style={{ fontSize: "0.85rem", color: "#475569" }}>Pour une boutique, une société ou une marque.</div>
            </div>
          </button>
        </div>
        <p style={{ marginTop: 16 }}>Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
      </SiteLayout>
    );
  }

  const isBiz = accountType === "entreprise";

  return (
    <SiteLayout activeNav="compte">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={() => setAccountType(null)} style={{ background: "none", border: "none", color: "#e67e22", fontSize: "1.4rem", cursor: "pointer", padding: 0 }} aria-label="Retour">←</button>
        <h1 style={{ margin: 0 }}>
          {isBiz ? "Compte entreprise" : "Compte personne"}
        </h1>
      </div>
      <form onSubmit={createAccount} style={{ display: "grid", gap: 12, maxWidth: 400, marginTop: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#94a3b8", border: "1px solid #e2e8f0", flexShrink: 0 }}>
            {preview ? <img src={preview} alt="aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (isBiz ? "🏢" : "👤")}
          </div>
          <span>
            <div style={{ fontWeight: 600 }}>{isBiz ? "Logo / Photo" : "Photo de profil"} <span style={{ color: "#dc2626" }}>*</span></div>
            <input type="file" accept="image/*" onChange={onAvatarChange} required />
          </span>
        </label>

        {isBiz && (
          <input className="search-input" placeholder="Nom de l'entreprise / boutique *" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} required />
        )}
        <input className="search-input" placeholder={isBiz ? "Prénom du responsable *" : "Prénom *"} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
        <input className="search-input" placeholder={isBiz ? "Nom du responsable *" : "Nom *"} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />

        {!isBiz && (
          <>
            <select className="city-select" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} required>
              <option value="">Genre *</option>
              <option>Homme</option>
              <option>Femme</option>
              <option>Autre</option>
            </select>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: "0.9em", color: "#475569" }}>Date de naissance * (16 ans minimum)</span>
              <input
                className="search-input"
                type="date"
                value={form.date_naissance}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                required
              />
            </label>
          </>
        )}

        {isBiz && (
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.9em", color: "#475569" }}>Année de création de l'entreprise *</span>
            <input
              className="search-input"
              type="number"
              min={1900}
              max={currentYear}
              placeholder={`ex. ${currentYear - 5}`}
              value={form.business_year}
              onChange={(e) => setForm({ ...form, business_year: e.target.value })}
              required
            />
          </label>
        )}

        <input className="search-input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: "0.9em", color: "#475569" }}>Téléphone *</span>
          <PhoneInput value={form.tel} onChange={(v) => setForm({ ...form, tel: v })} placeholder="Numéro" required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: "0.9em", color: "#475569" }}>Numéro WhatsApp (optionnel)</span>
          <PhoneInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="Numéro WhatsApp" />
        </label>
        <PasswordInput placeholder="Mot de passe *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
            required
          />
          <span>
            En continuant, j'accepte les{" "}
            <Link to="/conditions" target="_blank" style={{ color: "#ea580c", fontWeight: 600 }}>conditions d'utilisation</Link>{" "}
            et la{" "}
            <Link to="/privacy" target="_blank" style={{ color: "#ea580c", fontWeight: 600 }}>politique de confidentialité</Link>{" "}
            de MMP Shop.
          </span>
        </label>

        <button className="btn-whatsapp" disabled={loading || !acceptTerms}>{loading ? "..." : "Créer mon compte"}</button>
      </form>
      <p style={{ marginTop: 16 }}>Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
    </SiteLayout>
  );
}

function typeBtn(bg: string, accent: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
    background: bg, border: `2px solid ${accent}`, borderRadius: 14, cursor: "pointer",
    color: "#0f172a", textAlign: "left",
  };
}
