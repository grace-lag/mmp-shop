import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CATEGORIES, CATEGORY_ICONS } from "@/lib/annonces";

export const Route = createFileRoute("/categories/")({ component: CategoriesListPage });

function CategoriesListPage() {
  const navigate = useNavigate();
  return (
    <>
      <h1 style={{ marginTop: 16 }}>Catégories</h1>
      <div className="product-grid" style={{ marginTop: 16 }}>
        {CATEGORIES.map((c) => {
          const isHabillement = c === "Habillement";
          const onClick = () => {
            if (isHabillement) navigate({ to: "/categories/habillement" });
            else navigate({ to: "/annonces", search: { q: "", city: "", category: c } as any });
          };
          return (
            <button
              key={c}
              onClick={onClick}
              className="product-card"
              style={{ textAlign: "center", cursor: "pointer", border: "none", background: "white" }}
            >
              <div style={{ fontSize: 56 }}>{CATEGORY_ICONS[c] ?? "🏷️"}</div>
              <h3>{c}</h3>
            </button>
          );
        })}
      </div>
    </>
  );
}
