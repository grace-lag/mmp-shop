import { useEffect } from "react";

function apply(theme: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const mode =
    theme === "dark"
      ? "dark"
      : theme === "light"
        ? "light"
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

export function ThemeManager() {
  useEffect(() => {
    const theme = localStorage.getItem("theme") ?? "auto";
    apply(theme);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const t = localStorage.getItem("theme") ?? "auto";
      if (t === "auto") apply("auto");
    };
    mq.addEventListener?.("change", onChange);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") apply(e.newValue ?? "auto");
    };
    window.addEventListener("storage", onStorage);

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      apply(detail ?? localStorage.getItem("theme") ?? "auto");
    };
    window.addEventListener("theme-change", onCustom);

    return () => {
      mq.removeEventListener?.("change", onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("theme-change", onCustom);
    };
  }, []);

  return null;
}
