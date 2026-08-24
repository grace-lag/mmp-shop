import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth/AuthProvider";
import { frAuthError } from "@/lib/auth-errors";
import {
  PREMIUM_STATUS,
  fcfa,
  listMyPremiumOrders,
  statusLabel,
  updatePremiumOrder,
  uploadPaymentProof,
} from "@/lib/premium";

export const Route = createFileRoute("/mes-commandes")({
  head: () => ({
    meta: [
      { title: "Mes commandes Premium — MMP Shop" },
      { name: "description", content: "Suivez vos commandes Premium : devis, paiement, transit, dédouanement et livraison." },
      { property: "og:title", content: "Mes commandes Premium — MMP Shop" },
      { property: "og:description", content: "Suivi complet de vos commandes d'importation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOrdersPage,
});

const STEPS = PREMIUM_STATUS.filter((s) => s.key !== "annule").map((s) => s.key);

function MyOrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-premium-orders", user?.id],
    enabled: !!user,
    queryFn: listMyPremiumOrders,
  });

  if (!user) return null;

  const attachProof = async (orderId: string, file: File) => {
    setBusy(orderId);
    try {
      const path = await uploadPaymentProof(file, user.id);
      await updatePremiumOrder(orderId, { proof_url: path, status: "paiement_verification" });
      toast.success("Preuve envoyée, nous vérifions le paiement.");
      qc.invalidateQueries({ queryKey: ["my-premium-orders"] });
    } catch (e: any) {
      toast.error(frAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SiteLayout>
      <h1 style={{ marginTop: 16 }}>Mes commandes Premium</h1>
      {isLoading && <p>Chargement...</p>}
      {orders && orders.length === 0 && (
        <p>
          Aucune commande pour l'instant. <Link to="/premium">Découvrir le Premium</Link>
        </p>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {(orders ?? []).map((o) => {
          const idx = STEPS.indexOf(o.status);
          return (
            <div key={o.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{o.product_name}</strong>
                <span style={{ color: "#64748b", fontSize: "0.9em" }}>{o.reference}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span>
                  Total : <strong>{fcfa(o.total_amount)}</strong>
                </span>
                <span>
                  À payer : <strong>{fcfa(o.amount_due)}</strong>
                  {o.payment_choice === "deposit" ? " (acompte)" : ""}
                </span>
              </div>
              <div
                style={{
                  display: "inline-block",
                  alignSelf: "start",
                  background: o.status === "annule" ? "#fee2e2" : "rgba(249,115,22,0.12)",
                  color: o.status === "annule" ? "#b91c1c" : "#c2410c",
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: "0.85em",
                  fontWeight: 600,
                }}
              >
                {statusLabel(o.status)}
              </div>
              {o.status !== "annule" && (
                <div style={{ display: "flex", gap: 4 }}>
                  {STEPS.map((s, i) => (
                    <span
                      key={s}
                      title={statusLabel(s)}
                      style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? "#f97316" : "#e2e8f0" }}
                    />
                  ))}
                </div>
              )}
              <span style={{ fontSize: "0.85em", color: "#64748b" }}>
                Livraison estimée : {o.eta_days_min}–{o.eta_days_max} jours après confirmation du paiement.
              </span>
              {o.admin_note && <span style={{ fontSize: "0.88em" }}>Note MMP : {o.admin_note}</span>}
              {!o.proof_url && o.payment_method === "momo" && o.status === "devis" && (
                <label style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 10, cursor: "pointer", fontSize: "0.9em" }}>
                  {busy === o.id ? "Envoi..." : "Joindre la preuve de paiement Mobile Money"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) attachProof(o.id, f);
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </SiteLayout>
  );
}
