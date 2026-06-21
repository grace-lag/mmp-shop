import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/lib/annonces";
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

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "", prenom: "", genre: "", date_naissance: "",
    email: "", tel: "", whatsapp: "", password: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.genre || !form.date_naissance || !form.email || !form.tel || !form.whatsapp) {
      return toast.error("Tous les champs sont obligatoires.");
    }
    if (ageFromDate(form.date_naissance) < 18) {
      return toast.error("Pour utiliser MaMarketplace, vous devez avoir au moins 18 ans.");
    }
    if (!avatarFile) {
      return toast.error("La photo de profil est obligatoire.");
    }
    if (form.password.length < 6) return toast.error("Mot de passe : 6 caractères minimum");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            nom: form.nom,
            prenom: form.prenom,
            genre: form.genre,
            date_naissance: form.date_naissance,
            tel: form.tel,
            whatsapp: form.whatsapp,
          },
        },
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
      await supabase.auth.updateUser({
        data: {
          nom: form.nom,
          prenom: form.prenom,
          genre: form.genre,
          date_naissance: form.date_naissance,
          tel: form.tel,
          whatsapp: form.whatsapp,
          avatar_url,
        },
      });

      const profilePayload: Record<string, any> = {
        id: session.user.id,
        email: form.email.trim().toLowerCase(),
        nom: form.nom,
        prenom: form.prenom,
        genre: form.genre,
        date_naissance: form.date_naissance,
        tel: form.tel,
        whatsapp: form.whatsapp,
        avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error: profErr } = await (supabase as any)
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });
      if (profErr) throw profErr;

      toast.success("Compte créé et informations enregistrées !");
      navigate({ to: "/compte" });
    } catch (err: any) {
      toast.error(err?.message ?? "Création du compte échouée");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Créer un compte</h1>
      <form onSubmit={sendCode} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
              background: "#f1f5f9", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, color: "#94a3b8",
              border: "1px solid #e2e8f0", flexShrink: 0,
            }}
          >
            {preview ? <img src={preview} alt="aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </div>
          <span>
            <div style={{ fontWeight: 600 }}>Photo de profil <span style={{ color: "#dc2626" }}>*</span></div>
            <input type="file" accept="image/*" onChange={onAvatarChange} required />
          </span>
        </label>
        <input className="search-input" placeholder="Prénom *" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
        <input className="search-input" placeholder="Nom *" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
        <select className="city-select" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} required>
          <option value="">Genre *</option>
          <option>Homme</option>
          <option>Femme</option>
          <option>Autre</option>
        </select>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: "0.9em", color: "#475569" }}>Date de naissance *</span>
          <input
            className="search-input"
            type="date"
            value={form.date_naissance}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
            required
          />
        </label>
        <input className="search-input" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="search-input" type="tel" placeholder="Téléphone *" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} required />
        <PasswordInput
          placeholder="Mot de passe (min 6 caractères) *"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={6}
          required
        />

        <div style={{ marginTop: 4 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Recevoir le code de validation par :</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {([
              { id: "email", label: "📧 Email", enabled: true },
              { id: "sms", label: "📱 SMS", enabled: false },
              { id: "whatsapp", label: "💬 WhatsApp", enabled: false },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (!opt.enabled) return toast.message("Bientôt disponible. Utilise l'email pour le moment.");
                  setChannel(opt.id);
                }}
                className="btn-whatsapp"
                style={{
                  background: channel === opt.id ? "#e67e22" : opt.enabled ? "#e5e7eb" : "#f1f5f9",
                  color: channel === opt.id ? "white" : opt.enabled ? "#374151" : "#94a3b8",
                  fontSize: "0.85em",
                  padding: "10px 4px",
                  opacity: opt.enabled ? 1 : 0.7,
                }}
              >
                {opt.label}
                {!opt.enabled && <div style={{ fontSize: "0.7em" }}>bientôt</div>}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-whatsapp" disabled={loading}>{loading ? "..." : "Envoyer le code"}</button>
      </form>
      <p style={{ marginTop: 16 }}>Déjà inscrit ? <Link to="/login">Se connecter</Link></p>
    </SiteLayout>
  );
}
