import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { PhoneInput } from "@/components/PhoneInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CATEGORIES, CITIES, SUBCATEGORIES, getAnnonce, updateAnnonce } from "@/lib/annonces";
import { toast } from "sonner";

export const Route = createFileRoute("/modifier-annonce/$id")({ component: EditPage });

function EditPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: 0, city: "Brazzaville",
    category: "Électronique", subcategory: "", phone: "", whatsapp: "",
  });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: annonce, isLoading } = useQuery({ queryKey: ["annonce", id], queryFn: () => getAnnonce(id) });

  useEffect(() => {
    if (annonce) {
      setForm({
        title: annonce.title ?? "",
        description: annonce.description ?? "",
        price: annonce.price ?? 0,
        city: annonce.city ?? "Brazzaville",
        category: annonce.category ?? "Électronique",
        subcategory: (annonce as any).subcategory ?? "",
        phone: (annonce as any).phone ?? "",
        whatsapp: (annonce as any).whatsapp ?? "",
      });
    }
  }, [annonce]);

  const subs = useMemo(() => SUBCATEGORIES[form.category] ?? [], [form.category]);

  if (!user) return null;
  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (annonce && user.id !== (annonce as any).seller_id) {
    return <SiteLayout><p>Vous ne pouvez modifier que vos propres annonces.</p></SiteLayout>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price) return toast.error("Titre et prix requis");
    setSaving(true);
    try {
      await updateAnnonce(id, form as any);
      toast.success("Annonce mise à jour");
      navigate({ to: "/annonce/$id", params: { id } });
    } catch (err: any) {
      toast.error(err.message ?? "Échec de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Modifier l'annonce</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <input className="search-input" placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="search-input" placeholder="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="search-input" type="number" placeholder="Prix en FCFA" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
        <select className="city-select" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="city-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, subcategory: "" })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {subs.length > 0 && (
          <select className="city-select" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} required>
            <option value="">Choisir une sous-catégorie</option>
            {subs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="Téléphone" />
        <PhoneInput value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="WhatsApp" />
        <button className="btn-whatsapp" type="submit" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
      </form>
    </SiteLayout>
  );
}
