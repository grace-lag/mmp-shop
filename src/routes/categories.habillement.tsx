import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SUBCATEGORIES } from "@/lib/annonces";

export const Route = createFileRoute("/categories/habillement")({ component: HabillementPage });

const ICONS: Record<string, string> = {
  "Accessoires": "👜",
  "Vêtements": "👕",
  "Chaussures": "👟",
};

function HabillementPage() {
  const navigate = useNavigate();
  const subs = SUBCATEGORIES["Habillement"] ?? [];
  return (
    <>
      <h1 style={{ marginTop: 16 }}>Habillement</h1>
      <p style={{ color: "#64748b" }}>Choisissez une sous-catégorie :</p>
      <div className="product-grid" style={{ marginTop: 16 }}>
        {subs.map((s) => (
          <button
            key={s}
            onClick={() => navigate({ to: "/annonces", search: { q: "", city: "", category: "Habillement", subcategory: s } as any })}
            className="product-card"
            style={{ textAlign: "center", cursor: "pointer", border: "none", background: "white" }}
          >
            <div style={{ fontSize: 56 }}>{ICONS[s] ?? "🏷️"}</div>
            <h3>{s}</h3>
          </button>
        ))}
      </div>
    </>
  );
}
