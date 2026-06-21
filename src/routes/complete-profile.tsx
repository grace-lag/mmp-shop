import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/complete-profile")({ component: CompleteProfilePage });

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

function CompleteProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const meta: any = user?.user_metadata ?? {};
  const fullName = String(meta.full_name ?? meta.name ?? "").trim();
  const [form, setForm] = useState({
    prenom: meta.given_name ?? fullName.split(/\s+/)[0] ?? "",
    nom: meta.family_name ?? fullName.split(/\s+/).slice(1).join(" ") ?? "",
    tel: meta.tel ?? "",
    whatsapp: meta.whatsapp ?? "",
    date_naissance: meta.date_naissance ?? "",
    password: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(meta.avatar_url ?? meta.picture ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const m: any = user.user_metadata ?? {};
    const name = String(m.full_name ?? m.name ?? "").trim();
    const [first, ...rest] = name.split(/\s+/);
    setForm((current) => ({
      ...current,
      prenom: current.prenom || m.given_name || first || "",
      nom: current.nom || m.family_name || rest.join(" ") || "",
      tel: current.tel || m.tel || "",
      whatsapp: current.whatsapp || m.whatsapp || "",
      date_naissance: current.date_naissance || m.date_naissance || "",
    }));
    if (!preview && (m.avatar_url || m.picture)) setPreview(m.avatar_url || m.picture);
  }, [user, preview]);

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("profiles")
      .select("nom,prenom,tel,whatsapp,date_naissance,avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) return;
        setForm((current) => ({
          ...current,
          prenom: current.prenom || data.prenom || "",
          nom: current.nom || data.nom || "",
          tel: current.tel || data.tel || "",
          whatsapp: current.whatsapp || data.whatsapp || "",
          date_naissance: current.date_naissance || data.date_naissance || "",
        }));
        if (data.avatar_url) setPreview(data.avatar_url);
      });
  }, [user]);

  if (!user) return null;

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAvatarFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim() || !form.tel.trim() || !form.date_naissance) {
      return toast.error("Tous les champs sont obligatoires (sauf WhatsApp).");
    }
    if (ageFromDate(form.date_naissance) < 18) {
      return toast.error("Pour utiliser MaMarketplace, vous devez avoir au moins 18 ans.");
    }
    if (!preview && !avatarFile) return toast.error("La photo de profil est obligatoire.");
    if (form.password.length < 6) return toast.error("Mot de passe : 6 caractères minimum");

    setSaving(true);
    try {
      const avatar_url = avatarFile ? await uploadAvatar(avatarFile, user.id) : preview;
      const { error: authErr } = await supabase.auth.updateUser({
        password: form.password,
        data: {
          nom: form.nom,
          prenom: form.prenom,
          tel: form.tel,
          whatsapp: form.whatsapp,
          date_naissance: form.date_naissance,
          avatar_url,
        },
      });
      if (authErr) throw authErr;

      const { error: profileErr } = await (supabase as any)
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email ?? null,
          nom: form.nom,
          prenom: form.prenom,
          tel: form.tel,
          whatsapp: form.whatsapp,
          date_naissance: form.date_naissance,
          avatar_url,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      if (profileErr) throw profileErr;

      toast.success("Profil complété");
      navigate({ to: "/compte" });
    } catch (err: any) {
      toast.error(err?.message ?? "Impossible d'enregistrer le profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout activeNav="compte">
      <h1 style={{ marginTop: 16 }}>Compléter mon profil</h1>
      <form onSubmit={save} style={{ display: "grid", gap: 12, maxWidth: 500 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#94a3b8", border: "1px solid #e2e8f0", flexShrink: 0 }}>
            {preview ? <img src={preview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
          </div>
          <span>
            <div style={{ fontWeight: 600 }}>Photo de profil *</div>
            <input type="file" accept="image/*" onChange={onAvatarChange} />
          </span>
        </label>
        <input className="search-input" placeholder="Prénom *" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
        <input className="search-input" placeholder="Nom *" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
        <input className="search-input" type="tel" placeholder="Téléphone *" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} required />
        <input className="search-input" type="tel" placeholder="Numéro WhatsApp *" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} required />
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: "0.9em", color: "#475569" }}>Date de naissance *</span>
          <input className="search-input" type="date" value={form.date_naissance} max={new Date().toISOString().split("T")[0]} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} required />
        </label>
        <PasswordInput placeholder="Mot de passe (min 6 caractères) *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
        <button className="btn-whatsapp" disabled={saving}>{saving ? "..." : "Enregistrer mon profil"}</button>
      </form>
    </SiteLayout>
  );
}