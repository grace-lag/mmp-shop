import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/modifier-short/$id")({
  head: () => ({ meta: [{ title: "Modifier mon short — MMP Shop" }] }),
  component: EditShortPage,
});

function EditShortPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "" });

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: short, isLoading } = useQuery({
    queryKey: ["short-edit", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("shorts").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (short) {
      setForm({
        title: short.title ?? "",
        description: short.description ?? "",
        price: short.price != null ? String(short.price) : "",
      });
    }
  }, [short]);

  if (!user) return null;
  if (isLoading) return <SiteLayout><p>Chargement...</p></SiteLayout>;
  if (short && user.id !== short.user_id) {
    return <SiteLayout><p>Vous ne pouvez modifier que vos propres shorts.</p></SiteLayout>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priceNum = form.price.trim() === "" ? null : Number(form.price);
      const { error } = await (supabase as any).from("shorts").update({
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        price: priceNum,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Short mis à jour");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Échec de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout hideFooter>
      <h1 style={{ marginTop: 16 }}>Modifier mon short</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          <div>Titre</div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre du short" />
        </label>
        <label>
          <div>Description</div>
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
        </label>
        <label>
          <div>Prix (facultatif)</div>
          <input type="number" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="FCFA" />
        </label>
        <button type="submit" disabled={saving} className="btn-whatsapp" style={{ background: "#ea580c" }}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </SiteLayout>
  );
}
