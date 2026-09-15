import { useEffect } from "react";
import { lsGet } from "@/lib/safe-storage";

// Google Website Translator integration without banner or reload loops.
// The site is authored in French; when the user picks another language
// we load Google's translate widget and let it translate the DOM in place.
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
    __gtInitialized?: boolean;
  }
}

const COOKIE_NAME = "googtrans";

function setGoogTransCookie(target: string | null) {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const domains = ["", host, "." + host.replace(/^www\./, "")];
  for (const d of domains) {
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${d ? "; domain=" + d : ""}`;
  }
  if (target && target !== "fr") {
    const value = `/fr/${target}`;
    for (const d of domains) {
      document.cookie = `${COOKIE_NAME}=${value}; path=/${d ? "; domain=" + d : ""}`;
    }
  }
}

function hideBanner() {
  if (typeof document === "undefined") return;
  document.body.style.top = "0px";
  document.body.style.position = "static";
  document.documentElement.style.marginTop = "0px";
  const selectors = [
    ".goog-te-banner-frame",
    ".goog-te-ftab",
    ".goog-te-balloon-frame",
    ".goog-tooltip",
    "#goog-gt-tt",
    ".skiptranslate iframe",
    "iframe.goog-te-menu-frame",
  ];
  for (const sel of selectors) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => { el.style.display = "none"; el.style.visibility = "hidden"; });
  }
}

function ensureScript(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  if (window.__gtInitialized) return Promise.resolve(true);

  if (!document.getElementById("google_translate_element")) {
    const host = document.createElement("div");
    host.id = "google_translate_element";
    host.style.display = "none";
    document.body.appendChild(host);
  }

  return new Promise((resolve) => {
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "fr",
            includedLanguages: "fr,en",
            autoDisplay: false,
          },
          "google_translate_element",
        );
        window.__gtInitialized = true;
        hideBanner();
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    if (document.getElementById("google-translate-script")) {
      // Script tag exists but init callback may not have run yet — wait briefly.
      const start = Date.now();
      const poll = () => {
        if (window.__gtInitialized) return resolve(true);
        if (Date.now() - start > 5000) return resolve(false);
        setTimeout(poll, 200);
      };
      poll();
      return;
    }

    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function apply(lang: string) {
  if (typeof document === "undefined") return;
  const target = lang === "en" ? "en" : "fr";
  setGoogTransCookie(target === "fr" ? null : target);
  document.documentElement.lang = target;

  if (target === "fr") {
    // Clear any translation via the widget combo (no reload).
    const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (sel) {
      sel.value = "";
      sel.dispatchEvent(new Event("change"));
    }
    hideBanner();
    return;
  }

  const ready = await ensureScript();
  if (!ready) {
    // Script blocked/unavailable: fall back silently, no reload loop.
    console.warn("[LanguageManager] Google Translate unavailable; staying in French.");
    return;
  }

  // Trigger translation via the widget's select once it is present.
  const start = Date.now();
  const trigger = () => {
    const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (sel) {
      sel.value = target;
      sel.dispatchEvent(new Event("change"));
      hideBanner();
      // Re-hide after Google injects its DOM.
      setTimeout(hideBanner, 500);
      setTimeout(hideBanner, 1500);
      return;
    }
    if (Date.now() - start < 6000) setTimeout(trigger, 250);
  };
  trigger();
}

export function LanguageManager() {
  useEffect(() => {
    const lang = lsGet("lang") ?? "fr";
    if (lang !== "fr") apply(lang);

    // Keep the banner hidden if Google re-injects it.
    const mo = new MutationObserver(() => hideBanner());
    mo.observe(document.body, { childList: true, subtree: false });

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      apply(detail ?? lsGet("lang") ?? "fr");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lang") apply(e.newValue ?? "fr");
    };
    window.addEventListener("lang-change", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      mo.disconnect();
      window.removeEventListener("lang-change", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
