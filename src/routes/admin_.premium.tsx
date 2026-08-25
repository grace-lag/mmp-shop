import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { frAuthError } from "@/lib/auth-errors";
import { uploadAnnonceImage } from "@/lib/annonces";
import {
  PREMIUM_STATUS,
  createPremiumProduct,
  deletePremiumProduct,
  fcfa,
  getPremiumSettings,
  listAllPremiumOrders,
  listPremiumProducts,
  signedProofUrl,
  updatePremiumOrder,
  updatePremiumProduct,
  updatePremiumSettings,
  type PremiumSettings,
} from "@/lib/premium";

export const Route = createFileRoute("/admin_/premium")({
  head: () => ({
    meta: [
      { title: "Administration Premium — MMP Shop" },
      { name: "description", content: "Gérez le catalogue Premium, les commandes et la tarification d'importation." },
      { property: "og:title", content: "Administration Premium — MMP Shop" },
      { property: "og:description", content: "Catalogue, commandes et tarification Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPremiumPage,
});

const box: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 10 };

function AdminPremiumPage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"orders" | "products" | "settings">("orders");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (!user) return null;
  if (!isAdmin)
    return (
      <SiteLayout>
        <p style={{ marginTop: 16 }}>Accès réservé aux administrateurs.</p>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Administration Premium</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(["orders", "products", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: tab === t ? "2px solid #f97316" : "1px solid #cbd5e1",
              background: tab === t ? "rgba(249,115,22,0.1)" : "transparent",
              borderRadius: 999,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {t === "orders" ? "Commandes" : t === "products" ? "Catalogue" : "Tarification"}
          </button>
        ))}
        <Link to="/admin" style={{ marginLeft: "auto", alignSelf: "center" }}>
          ← Espace admin
        </Link>
      </div>
      {tab === "orders" && <OrdersTab onChange={() => qc.invalidateQueries({ queryKey: ["admin-premium-orders"] })} />}
      {tab === "products" && <ProductsTab userId={user.id} />}
      {tab === "settings" && <SettingsTab />}
    </SiteLayout>
  );
}

function OrdersTab({ onChange }: { onChange: () => void }) {
  const { data: orders, isLoading } = useQuery({ queryKey: ["admin-premium-orders"], queryFn: listAllPremiumOrders });
  const [note, setNote] = useState<Record<string, string>>({});

  const setStatus = async (id: string, status: string) => {
    try {
      await updatePremiumOrder(id, { status });
      toast.success("Statut mis à jour");
      onChange();
    } catch (e: any) {
      toast.error(frAuthError(e));
    }
  };

  const saveNote = async (id: string) => {
    try {
      await updatePremiumOrder(id, { admin_note: note[id] ?? "" });
      toast.success("Note enregistrée");
      onChange();
    } catch (e: any) {
      toast.error(frAuthError(e));
    }
  };

  const openProof = async (path: string) => {
    const url = await signedProofUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Preuve indisponible");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {isLoading && <p>Chargement...</p>}
      {orders && orders.length === 0 && <p>Aucune commande Premium.</p>}
      {(orders ?? []).map((o) => (
        <div key={o.id} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>
              {o.reference} — {o.product_name}
            </strong>
            <span style={{ color: "#64748b", fontSize: "0.9em" }}>
              {o.kind === "catalog" ? "Catalogue" : "Achat pour compte"}
            </span>
          </div>
          <span style={{ fontSize: "0.9em" }}>
            {o.full_name} · {o.phone} · {o.city} {o.address ? `· ${o.address}` : ""}
          </span>
          {o.source_url && (
            <a href={o.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.88em" }}>
              Lien du produit
            </a>
          )}
          {o.notes && <span style={{ fontSize: "0.88em", color: "#475569" }}>Précisions : {o.notes}</span>}
          <span style={{ fontSize: "0.9em" }}>
            Qté {o.quantity} · {o.weight_kg} kg · Produit {fcfa(o.base_price)} + marge {fcfa(o.margin_amount)} + fret{" "}
            {fcfa(o.freight_amount)} + taxes {fcfa(o.customs_amount)} + service {fcfa(o.service_fee)} ={" "}
            <strong>{fcfa(o.total_amount)}</strong>
          </span>
          <span style={{ fontSize: "0.9em" }}>
            À payer {fcfa(o.amount_due)} ({o.payment_choice === "deposit" ? "acompte" : "total"}) ·{" "}
            {o.payment_method === "momo" ? "Mobile Money" : "Espèces au siège"}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select className="city-select" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {PREMIUM_STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            {o.proof_url && (
              <button
                onClick={() => openProof(o.proof_url!)}
                style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}
              >
                Voir la preuve
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="search-input"
              placeholder="Note pour le client"
              value={note[o.id] ?? o.admin_note}
              onChange={(e) => setNote({ ...note, [o.id]: e.target.value })}
            />
            <button className="btn-whatsapp" onClick={() => saveNote(o.id)}>
              Enregistrer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: products } = useQuery({
    queryKey: ["admin-premium-products"],
    queryFn: () => listPremiumProducts({ includeInactive: true }),
  });
  const [form, setForm] = useState({
    title: "",
    description: "",
    origin_country: "France",
    shop_name: "",
    source_url: "",
    base_price: 0,
    weight_kg: 1,
    category: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-premium-products"] });
    qc.invalidateQueries({ queryKey: ["premium-products"] });
  };

  const add = async () => {
    if (!form.title.trim() || !form.base_price) return toast.error("Titre et prix requis");
    setSaving(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadAnnonceImage(f, userId));
      await createPremiumProduct({ ...form, images: urls, image_url: urls[0] ?? "" });
      toast.success("Produit Premium publié");
      setForm({ title: "", description: "", origin_country: "France", shop_name: "", source_url: "", base_price: 0, weight_kg: 1, category: "" });
      setFiles([]);
      refresh();
    } catch (e: any) {
      toast.error(frAuthError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={box}>
        <strong>Ajouter un produit Premium</strong>
        <input className="search-input" placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="search-input" rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="search-input" style={{ flex: 1 }} type="number" placeholder="Prix boutique (FCFA)" value={form.base_price || ""} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
          <input className="search-input" style={{ width: 130 }} type="number" step="0.1" placeholder="Poids (kg)" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="search-input" style={{ flex: 1 }} placeholder="Boutique d'origine" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
          <input className="search-input" style={{ width: 150 }} placeholder="Pays" value={form.origin_country} onChange={(e) => setForm({ ...form, origin_country: e.target.value })} />
        </div>
        <input className="search-input" placeholder="Lien source (interne)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
        <input className="search-input" placeholder="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
        <button className="btn-whatsapp" onClick={add} disabled={saving}>
          {saving ? "Publication..." : "Publier"}
        </button>
      </div>

      {(products ?? []).map((p) => (
        <div key={p.id} style={box}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {p.image_url && <img src={p.image_url} alt={p.title} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />}
            <div style={{ display: "grid" }}>
              <strong>{p.title}</strong>
              <span style={{ fontSize: "0.85em", color: "#64748b" }}>
                {fcfa(p.base_price)} · {p.weight_kg} kg · {p.origin_country}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={async () => {
                await updatePremiumProduct(p.id, { is_active: !p.is_active });
                refresh();
              }}
              style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}
            >
              {p.is_active ? "Retirer du catalogue" : "Remettre en ligne"}
            </button>
            <button
              onClick={async () => {
                if (!confirm("Supprimer ce produit ?")) return;
                await deletePremiumProduct(p.id);
                refresh();
              }}
              style={{ border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["premium-settings"], queryFn: getPremiumSettings });
  const [form, setForm] = useState<PremiumSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  if (!form) return <p>Chargement...</p>;

  const num = (k: keyof PremiumSettings, label: string) => (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: "0.9em", color: "#475569" }}>{label}</span>
      <input
        className="search-input"
        type="number"
        value={form[k] as number}
        onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
      />
    </label>
  );

  return (
    <div style={{ ...box, maxWidth: 520 }}>
      <strong>Tarification Premium</strong>
      {num("margin_percent", "Marge MMP (%)")}
      {num("freight_per_kg", "Fret par kg (FCFA)")}
      {num("customs_percent", "Taxes & douane (%)")}
      {num("service_fee", "Frais de service fixes (FCFA)")}
      {num("deposit_percent", "Acompte (%)")}
      {num("eta_days_min", "Délai min (jours)")}
      {num("eta_days_max", "Délai max (jours)")}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: "0.9em", color: "#475569" }}>Numéro Mobile Money</span>
        <input className="search-input" value={form.momo_number} onChange={(e) => setForm({ ...form, momo_number: e.target.value })} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: "0.9em", color: "#475569" }}>Adresse du siège</span>
        <input className="search-input" value={form.office_address} onChange={(e) => setForm({ ...form, office_address: e.target.value })} />
      </label>
      <button
        className="btn-whatsapp"
        onClick={async () => {
          try {
            await updatePremiumSettings(form);
            toast.success("Tarification enregistrée");
            qc.invalidateQueries({ queryKey: ["premium-settings"] });
          } catch (e: any) {
            toast.error(frAuthError(e));
          }
        }}
      >
        Enregistrer
      </button>
    </div>
  );
}
