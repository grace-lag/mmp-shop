import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, splitPhone, type Country } from "@/lib/countries";

type Props = {
  value: string; // numéro complet sans le +, ex "242066123456"
  onChange: (full: string) => void;
  placeholder?: string;
  required?: boolean;
  defaultCountryCode?: string; // ex "CG"
};

export function PhoneInput({ value, onChange, placeholder = "Numéro", required, defaultCountryCode = "CG" }: Props) {
  const initial = useMemo(() => {
    if (value) return splitPhone(value);
    const c = COUNTRIES.find((x) => x.code === defaultCountryCode) ?? DEFAULT_COUNTRY;
    return { country: c, local: "" };
  }, [value, defaultCountryCode]);

  const [country, setCountry] = useState<Country>(initial.country);
  const [local, setLocal] = useState<string>(initial.local);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Si value externe change, resync
  useEffect(() => {
    if (!value) return;
    const s = splitPhone(value);
    setCountry(s.country);
    setLocal(s.local);
  }, [value]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const emit = (c: Country, l: string) => {
    onChange((c.dial + l.replace(/\D/g, "")).replace(/\D/g, ""));
  };

  const filtered = COUNTRIES.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", gap: 0, alignItems: "stretch" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 12px", border: "1px solid #e2e8f0",
          borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRight: 0,
          background: "#fff", cursor: "pointer", fontSize: 15, color: "#0f172a",
        }}
        aria-label="Choisir le pays"
      >
        <span style={{ fontSize: 20 }}>{country.flag}</span>
        <span style={{ fontWeight: 600 }}>+{country.dial}</span>
        <span style={{ color: "#94a3b8", fontSize: 10 }}>▼</span>
      </button>
      <input
        type="tel"
        inputMode="numeric"
        className="search-input"
        placeholder={placeholder}
        value={local}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          setLocal(v);
          emit(country, v);
        }}
        required={required}
        style={{ flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
      />
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            width: "min(360px, 90vw)", maxHeight: 320, overflowY: "auto",
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50,
          }}
        >
          <div style={{ padding: 8, position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un pays..."
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
            />
          </div>
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCountry(c);
                setOpen(false);
                setSearch("");
                emit(c, local);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", border: 0, background: c.code === country.code ? "#f1f5f9" : "#fff",
                cursor: "pointer", textAlign: "left", fontSize: 14,
              }}
            >
              <span style={{ fontSize: 22 }}>{c.flag}</span>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ color: "#64748b" }}>+{c.dial}</span>
            </button>
          ))}
          {filtered.length === 0 && <p style={{ padding: 12, color: "#94a3b8", margin: 0 }}>Aucun pays</p>}
        </div>
      )}
    </div>
  );
}
