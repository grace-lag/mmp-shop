import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, FileText, Landmark, Smartphone, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PhoneInput } from "@/components/PhoneInput";
import { CITIES } from "@/lib/annonces";
import { frAuthError } from "@/lib/auth-errors";
import {
  computeQuote,
  createPremiumOrder,
  fcfa,
  getPremiumSettings,
  uploadPaymentProof,
  type PremiumProduct,
} from "@/lib/premium";

type Props = { kind: "catalog" | "sourcing"; product?: PremiumProduct };

const card: React.CSSProperties = {
  background: "var(--card-bg, #fff)",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  display: "grid",
  gap: 10,
};

export function PremiumOrderForm({ kind, product }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["premium-settings"], queryFn: getPremiumSettings });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [productName, setProductName] = useState(product?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(product?.source_url ?? "");
  const [declaredPrice, setDeclaredPrice] = useState<number>(kind === "catalog" ? (product?.base_price ?? 0) : 0);
  const [weight, setWeight] = useState<number>(product?.weight_kg ?? 1);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Brazzaville");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<"full" | "deposit">("full");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash">("momo");
  const [proof, setProof] = useState<File | null>(null);
  const [done, setDone] = useState<{ reference: string; due: number } | null>(null);

  const quote = useMemo(() => {
    if (!settings) return null;
    return computeQuote(settings, {
      basePrice: kind === "catalog" ? (product?.base_price ?? 0) : declaredPrice,
      quantity,
      weightKg: weight,
    });
  }, [settings, kind, product, declaredPrice, quantity, weight]);

  const amountDue = useMemo(() => {
    if (!quote || !settings) return 0;
    return paymentChoice === "deposit" ? (quote.total * settings.deposit_percent) / 100 : quote.total;
  }, [quote, settings, paymentChoice]);

  if (!settings || !quote) return <p>Chargement du devis...</p>;

  const submit = async () => {
    if (!user) return navigate({ to: "/login" });
    if (!productName.trim()) return toast.error("Indique le nom du produit");
    if (kind === "sourcing" && declaredPrice <= 0) return toast.error("Indique le prix du produit chez le fournisseur");
    if (!fullName.trim() || !phone.trim()) return toast.error("Nom et téléphone requis");
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (paymentMethod === "momo" && proof) proofPath = await uploadPaymentProof(proof, user.id);
      const order = await createPremiumOrder({
        kind,
        product_id: product?.id ?? null,
        product_name: productName.trim(),
        source_url: sourceUrl.trim(),
        quantity,
        weight_kg: weight,
        base_price: kind === "catalog" ? (product?.base_price ?? 0) : declaredPrice,
        margin_amount: quote.margin,
        freight_amount: quote.freight,
        customs_amount: quote.customs,
        service_fee: quote.serviceFee,
        total_amount: quote.total,
        amount_due: amountDue,
        payment_choice: paymentChoice,
        payment_method: paymentMethod,
        status: proofPath ? "paiement_verification" : "devis",
        proof_url: proofPath,
        full_name: fullName.trim(),
        phone: phone.trim(),
        city,
        address: address.trim(),
        notes: notes.trim(),
        eta_days_min: settings.eta_days_min,
        eta_days_max: settings.eta_days_max,
      });
      setDone({ reference: order.reference, due: amountDue });
      setStep(3);
    } catch (e: any) {
      toast.error(frAuthError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 3 && done) {
    return (
      <div style={{ ...card, borderColor: "#16a34a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 700 }}>
          <Check size={20} /> Commande enregistrée
        </div>
        <p style={{ margin: 0 }}>
          Référence : <strong>{done.reference}</strong>
        </p>
        <p style={{ margin: 0 }}>
          Montant à payer : <strong>{fcfa(done.due)}</strong>
          {paymentChoice === "deposit" ? " (acompte)" : ""}
        </p>
        {paymentMethod === "momo" ? (
          <p style={{ margin: 0 }}>
            Envoie le montant par Mobile Money au <strong>{settings.momo_number}</strong> en indiquant la référence{" "}
            <strong>{done.reference}</strong>. Dès validation, ta commande passe en préparation.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Présente-toi à notre siège ({settings.office_address}) avec la référence <strong>{done.reference}</strong>{" "}
            pour régler en espèces.
          </p>
        )}
        <p style={{ margin: 0 }}>
          Livraison estimée : <strong>{settings.eta_days_min} à {settings.eta_days_max} jours</strong> après confirmation
          du paiement.
        </p>
        <button className="btn-whatsapp" onClick={() => navigate({ to: "/mes-commandes" })}>
          Suivre ma commande
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 620 }}>
      {step === 1 && (
        <div style={card}>
          <strong>1. Détails du produit</strong>
          {kind === "sourcing" ? (
            <>
              <input
                className="search-input"
                placeholder="Nom du produit"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
              <input
                className="search-input"
                placeholder="Lien du produit (Alibaba, AliExpress, boutique...)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
              <input
                className="search-input"
                type="number"
                placeholder="Prix affiché chez le fournisseur (en FCFA)"
                value={declaredPrice || ""}
                onChange={(e) => setDeclaredPrice(Number(e.target.value))}
              />
            </>
          ) : (
            <p style={{ margin: 0, color: "#475569" }}>
              {product?.title} — {product?.shop_name || product?.origin_country}
            </p>
          )}
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.9em", color: "#475569" }}>Quantité</span>
            <input
              className="search-input"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: "0.9em", color: "#475569" }}>Poids estimé par article (kg)</span>
            <input
              className="search-input"
              type="number"
              step="0.1"
              min={0}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              disabled={kind === "catalog"}
            />
          </label>
          <button className="btn-whatsapp" onClick={() => setStep(2)}>
            Obtenir mon devis
          </button>
        </div>
      )}

      {step === 2 && (
        <>
          <div style={card}>
            <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} /> 2. Votre devis
            </strong>
            <Row label={`Produit ${quantity > 1 ? `× ${quantity}` : ""}`} value={fcfa(quote.productPrice)} />
            <Row label="Transport & livraison" value={fcfa(quote.freight)} />
            <Row label="Taxes & dédouanement" value={fcfa(quote.customs)} />
            <Row label="Frais de service MMP" value={fcfa(quote.serviceFee)} />
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <Row label="Total" value={fcfa(quote.total)} bold />
            </div>
            <p style={{ margin: 0, fontSize: "0.85em", color: "#64748b" }}>
              Devis valable 72 h. Livraison estimée {settings.eta_days_min}–{settings.eta_days_max} jours après
              confirmation du paiement.
            </p>
          </div>

          <div style={card}>
            <strong>3. Paiement</strong>
            <div style={{ display: "grid", gap: 8 }}>
              <Choice
                active={paymentChoice === "full"}
                onClick={() => setPaymentChoice("full")}
                title="Payer la totalité"
                sub={fcfa(quote.total)}
              />
              <Choice
                active={paymentChoice === "deposit"}
                onClick={() => setPaymentChoice("deposit")}
                title={`Acompte ${settings.deposit_percent}%`}
                sub={`${fcfa((quote.total * settings.deposit_percent) / 100)} maintenant, solde à la livraison`}
              />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <Choice
                active={paymentMethod === "momo"}
                onClick={() => setPaymentMethod("momo")}
                title="Mobile Money (MTN / Airtel)"
                sub={settings.momo_number}
                Icon={Smartphone}
              />
              <Choice
                active={paymentMethod === "cash"}
                onClick={() => setPaymentMethod("cash")}
                title="Espèces au siège"
                sub={settings.office_address}
                Icon={Landmark}
              />
            </div>
            {paymentMethod === "momo" && (
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                <Upload size={18} />
                <span style={{ fontSize: "0.9em" }}>
                  {proof ? proof.name : "Joindre la preuve de paiement (optionnel maintenant)"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <div style={card}>
            <strong>4. Livraison</strong>
            <input
              className="search-input"
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <PhoneInput value={phone} onChange={setPhone} placeholder="Téléphone" required />
            <select className="city-select" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.filter((c) => c !== "Tout Congo").map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              className="search-input"
              placeholder="Adresse / quartier"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <textarea
              className="search-input"
              rows={3}
              placeholder="Précisions (taille, couleur, modèle...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn-whatsapp" onClick={submit} disabled={submitting}>
                {submitting ? "Envoi..." : `Confirmer et payer ${fcfa(amountDue)}`}
              </button>
              <button
                onClick={() => setStep(1)}
                style={{ background: "transparent", border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 14px" }}
              >
                Modifier
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  sub,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  Icon?: React.ComponentType<any>;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        width: "100%",
        border: active ? "2px solid #f97316" : "1px solid #cbd5e1",
        background: active ? "rgba(249,115,22,0.08)" : "transparent",
        borderRadius: 10,
        padding: 10,
        cursor: "pointer",
      }}
    >
      {Icon && <Icon size={20} strokeWidth={1.8} />}
      <span style={{ display: "grid" }}>
        <strong style={{ fontSize: "0.95em" }}>{title}</strong>
        <span style={{ fontSize: "0.82em", color: "#64748b" }}>{sub}</span>
      </span>
    </button>
  );
}
