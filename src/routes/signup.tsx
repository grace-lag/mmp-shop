import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

type Channel = "email" | "sms" | "whatsapp";

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
  const [step, setStep] = useState<"form" | "verify">("form");
  const [channel, setChannel] = useState<Channel>("email");
  const [form, setForm] = useState({
    nom: "", prenom: "", genre: "", date_naissance: "",
    email: "", tel: "", password: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (channel !== "email") {
      return toast.error("La validation par SMS et WhatsApp sera bientôt disponible. Utilise l'email pour le moment.");
    }
    if (!form.prenom || !form.nom || !form.genre || !form.date_naissance) {
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
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        shouldCreateUser: true,
        data: { nom: form.nom, prenom: form.prenom },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Code envoyé à " + form.email);
    setStep("verify");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: form.email,
      token: code.trim(),
      type: "email",
    });
    if (error || !data.session?.user) {
      setLoading(false);
      return toast.error(error?.message ?? "Code invalide");
    }
    const userId = data.session.user.id;

    const { error: upErr } = await supabase.auth.updateUser({
      password: form.password,
      data: { nom: form.nom, prenom: form.prenom },
    });
    if (upErr) {
      setLoading(false);
      return toast.error("Mot de passe non défini : " + upErr.message);
    }

    let avatar_url: string | null = null;
    if (avatarFile) {
      try { avatar_url = await uploadAvatar(avatarFile, userId); }
      catch (err: any) { toast.error("Photo non enregistrée : " + (err.message ?? err)); }
    }
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: userId,
      email: form.email,
      nom: form.nom, prenom: form.prenom, genre: form.genre,
      date_naissance: form.date_naissance, tel: form.tel,
      ...(avatar_url ? { avatar_url } : {}),
    }, { onConflict: "id" });
    if (profErr) toast.error("Profil : " + profErr.message);

    setLoading(false);
    toast.success("Compte créé et mot de passe activé !");
    navigate({ to: "/compte" });
  };

  const resend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: form.email, options: { shouldCreateUser: true } });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Nouveau code envoyé");
  };

  if (step === "verify") {
    return (
      <SiteLayout activeNav="compte">
        <h1 style={{ marginTop: 16 }}>Vérification</h1>
        <p>Un code à 6 chiffres a été envoyé à <strong>{form.email}</strong>. Saisis-le ci-dessous pour activer ton compte.</p>
        <form onSubmit={verifyCode} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <input
            className="search-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ fontSize: "1.4em", letterSpacing: "0.4em", textAlign: "center" }}
            required
          />
          <button className="btn-whatsapp" disabled={loading || code.length < 6}>
            {loading ? "..." : "Valider et créer mon compte"}
          </button>
          <button type="button" onClick={resend} disabled={loading} style={{ background: "transparent", border: 0, color: "#e67e22", cursor: "pointer" }}>
            Renvoyer le code
          </button>
          <button type="button" onClick={() => setStep("form")} style={{ background: "transparent", border: 0, color: "#64748b", cursor: "pointer" }}>
            ← Modifier mes informations
          </button>
        </form>
      </SiteLayout>
    );
  }

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
        <input className="search-input" type="password" placeholder="Mot de passe (min 6 caractères) *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />

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
