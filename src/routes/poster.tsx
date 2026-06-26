import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ImageIcon, Plus, X } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { PhoneInput } from "@/components/PhoneInput";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CATEGORIES, CITIES, SUBCATEGORIES, createAnnonce, uploadAnnonceImage } from "@/lib/annonces";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/poster")({ component: PosterPage });

function PosterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: 0,
    city: "Brazzaville",
    category: "Électronique",
    subcategory: "",
    phone: "",
    whatsapp: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [sellerName, setSellerName] = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const moreInputRef = useRef<HTMLInputElement>(null);

  const subs = useMemo(() => SUBCATEGORIES[form.category] ?? [], [form.category]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nom,prenom").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setSellerName(`${data.prenom || ""} ${data.nom || ""}`.trim() || (user.email ?? ""));
    });
  }, [user]);

  useEffect(() => {
    setForm((f) => ({ ...f, subcategory: "" }));
  }, [form.category]);

  if (!user) return null;

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length === 0) return;
    setFiles((prev) => [...prev, ...list]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price) return toast.error("Titre et prix requis");
    if (files.length === 0) return toast.error("Ajoute au moins une photo du produit");
    if (subs.length > 0 && !form.subcategory) return toast.error("Choisis une sous-catégorie");
    setSubmitting(true);
    try {
      const uploaded: string[] = [];
      for (const f of files) {
        const url = await uploadAnnonceImage(f, user.id);
        uploaded.push(url);
      }
      const a = await createAnnonce({
        ...form,
        seller_name: sellerName,
        image_url: uploaded[0] ?? "",
        images: uploaded,
      });
      toast.success("Annonce publiée !");
      navigate({ to: "/annonce/$id", params: { id: a.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const tileBase: React.CSSProperties = {
    width: 96, height: 96, borderRadius: 12, border: "2px dashed #cbd5e1",
    background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#64748b", flexShrink: 0,
  };

  return (
    <SiteLayout activeNav="poster">
      <h1 style={{ marginTop: 16 }}>Poster une annonce</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 600 }}>
        <input className="search-input" placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="search-input" placeholder="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="search-input" type="number" placeholder="Prix en FCFA" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
        <select className="city-select" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="city-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {subs.length > 0 && (
          <select className="city-select" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} required>
            <option value="">— Choisir une sous-catégorie —</option>
            {subs.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <input className="search-input" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="search-input" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
            Photos du produit <span style={{ color: "#64748b", fontWeight: 400, fontSize: "0.85em" }}>(au moins 1, ajoute autant que tu veux)</span>
          </label>
          <input ref={firstInputRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />
          <input ref={moreInputRef} type="file" accept="image/*" multiple onChange={addFiles} style={{ display: "none" }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {files.length === 0 && (
              <button type="button" onClick={() => firstInputRef.current?.click()} style={tileBase} aria-label="Importer une photo">
                <ImageIcon size={36} />
              </button>
            )}

            {files.map((f, i) => (
              <div key={i} style={{ position: "relative", width: 96, height: 96 }}>
                <img src={URL.createObjectURL(f)} alt={`photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label="Retirer"
                  style={{
                    position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
                    background: "#dc2626", color: "#fff", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {files.length > 0 && (
              <button type="button" onClick={() => moreInputRef.current?.click()} style={tileBase} aria-label="Ajouter d'autres photos">
                <Plus size={36} />
              </button>
            )}
          </div>
        </div>

        <button className="btn-whatsapp" type="submit" disabled={submitting}>{submitting ? "Publication..." : "Publier"}</button>
      </form>
    </SiteLayout>
  );
}
