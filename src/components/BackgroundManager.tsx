import { useEffect } from "react";
import { lsGet } from "@/lib/safe-storage";

export const BG_MODE_KEY = "site_bg_mode"; // "default" | "color" | "image"
export const BG_COLOR_KEY = "site_bg_color";
export const BG_IMAGE_KEY = "site_bg_image";
export const BG_EVENT = "site-bg-change";

export type BgPref = { mode: "default" | "color" | "image"; color?: string; image?: string };

export function readBgPref(): BgPref {
  const mode = (lsGet(BG_MODE_KEY) ?? "default") as BgPref["mode"];
  return {
    mode: mode === "color" || mode === "image" ? mode : "default",
    color: lsGet(BG_COLOR_KEY) ?? undefined,
    image: lsGet(BG_IMAGE_KEY) ?? undefined,
  };
}

/** Applies a background preference to the whole document. */
export function applyBgPref(pref: BgPref) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (pref.mode === "color" && pref.color) {
    root.style.setProperty("--site-bg", pref.color);
    root.style.setProperty("--site-bg-image", "none");
    root.classList.add("custom-bg");
    return;
  }
  if (pref.mode === "image" && pref.image) {
    root.style.setProperty("--site-bg", "#f7e6d0");
    root.style.setProperty("--site-bg-image", `url("${pref.image}")`);
    root.classList.add("custom-bg");
    return;
  }
  root.classList.remove("custom-bg");
  root.style.removeProperty("--site-bg");
  root.style.removeProperty("--site-bg-image");
}

export function BackgroundManager() {
  useEffect(() => {
    applyBgPref(readBgPref());

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as BgPref | undefined;
      applyBgPref(detail ?? readBgPref());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("site_bg")) applyBgPref(readBgPref());
    };
    window.addEventListener(BG_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BG_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
