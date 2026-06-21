import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/parametres")({ component: ParametresPage });

function ParametresPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", prenom: "", genre: "", date_naissance: "", tel: "", whatsapp: "", email: "", avatar_url: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("nom,prenom,genre,date_naissance,tel,whatsapp,email,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setForm({
            nom: data.nom ?? "",
            prenom: data.prenom ?? "",
            genre: data.genre ?? "",
            date_naissance: (data as any).date_naissance ?? "",
            tel: data.tel ?? "",
            whatsapp: data.whatsapp ?? "",
            email: data.email ?? user.email ?? "",
            avatar_url: data.avatar_url ?? "",
          });
          setNewEmail(data.email ?? user.email ?? "");
        }
      });
  }, [user]);


  if (!user) return null;

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tel.trim() || !form.whatsapp.trim()) {
      return toast.error("Le téléphone et le numéro WhatsApp sont obligatoires.");
    }
    setSaving(true);
    try {
      let avatar_url = form.avatar_url;
      if (avatarFile) {
        avatar_url = await uploadAvatar(avatarFile, user.id);
      }
      const updates = {
        id: user.id,
        email: form.email || user.email || null,
        nom: form.nom,
        prenom: form.prenom,
        genre: form.genre,
        tel: form.tel,
        whatsapp: form.whatsapp,
        avatar_url,
        updated_at: new Date().toISOString(),
        ...(form.date_naissance ? { date_naissance: form.date_naissance } : {}),
      };
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert(updates, { onConflict: "id" });

      if (error) throw error;
      await supabase.auth.updateUser({
        data: {
          nom: form.nom,
          prenom: form.prenom,
          genre: form.genre,
          date_naissance: form.date_naissance || null,
          tel: form.tel,
          whatsapp: form.whatsapp,
          avatar_url,
        },
      });
      setForm((f) => ({ ...f, avatar_url }));
      setAvatarFile(null);
      setPreview(null);
      toast.success("Profil mis à jour");
    } catch (err: any) {
      console.error("Profile update failed", err);
      toast.error(err?.message ?? "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };


  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === form.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) return toast.error(error.message);
    toast.success("Un email de confirmation a été envoyé à la nouvelle adresse.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Mot de passe trop court (min 6 caractères)");
    if (newPassword !== confirmPassword) return toast.error("Les mots de passe ne correspondent pas");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Mot de passe mis à jour");
  };

  const currentAvatar = preview ?? form.avatar_url;

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Paramètres</h1>

      <form onSubmit={saveProfile} style={{ display: "grid", gap: 12, maxWidth: 500 }}>
        <h2 style={{ marginBottom: 0 }}>Profil</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%", overflow: "hidden",
              background: "#f1f5f9", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 32, color: "#94a3b8",
              border: "1px solid #e2e8f0", flexShrink: 0,
            }}
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : "👤"}
          </div>
          <span>
            <div style={{ fontWeight: 600 }}>Photo de profil</div>
            <input type="file" accept="image/*" onChange={onAvatarChange} />
          </span>
        </label>
        <input className="search-input" placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
        <input className="search-input" placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        <select className="city-select" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
          <option value="">Genre</option>
          <option>Homme</option>
          <option>Femme</option>
          <option>Autre</option>
        </select>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: "0.9em", color: "#475569" }}>Date de naissance</span>
          <input className="search-input" type="date" value={form.date_naissance} max={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} />
        </label>
        <input className="search-input" placeholder="Téléphone" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} required />
        <input className="search-input" placeholder="Numéro WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />

        <button className="btn-whatsapp" disabled={saving}>{saving ? "..." : "Enregistrer le profil"}</button>
      </form>

      <form onSubmit={updateEmail} style={{ display: "grid", gap: 12, maxWidth: 500, marginTop: 32 }}>
        <h2 style={{ marginBottom: 0 }}>Adresse email</h2>
        <input className="search-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Nouvel email" required />
        <button className="btn-whatsapp" disabled={savingEmail || newEmail === form.email}>
          {savingEmail ? "..." : "Mettre à jour l'email"}
        </button>
      </form>

      <form onSubmit={updatePassword} style={{ display: "grid", gap: 12, maxWidth: 500, marginTop: 32 }}>
        <h2 style={{ marginBottom: 0 }}>Mot de passe</h2>
        <PasswordInput placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
        <PasswordInput placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
        <button className="btn-whatsapp" disabled={savingPassword}>{savingPassword ? "..." : "Changer le mot de passe"}</button>
      </form>
    </SiteLayout>
  );
}
