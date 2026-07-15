import { useEffect } from "react";

// Lightweight Google Website Translator integration.
// The site is authored in French; when the user picks another language
// we load Google's translate widget and let it translate the DOM.
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
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

function ensureScript() {
  if (typeof document === "undefined") return;
  if (document.getElementById("google-translate-script")) return;

  if (!document.getElementById("google_translate_element")) {
    const host = document.createElement("div");
    host.id = "google_translate_element";
    host.style.display = "none";
    document.body.appendChild(host);
  }

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
    } catch {
      /* ignore */
    }
  };

  const s = document.createElement("script");
  s.id = "google-translate-script";
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);
}

function apply(lang: string) {
  if (typeof document === "undefined") return;
  const target = lang === "en" ? "en" : "fr";
  setGoogTransCookie(target === "fr" ? null : target);
  document.documentElement.lang = target;

  if (target === "fr") {
    // Force reload to drop any translated DOM cleanly.
    if (document.documentElement.className.includes("translated")) {
      window.location.reload();
    }
    return;
  }

  ensureScript();

  // If widget is already initialized, trigger via its select element.
  const trySelect = (attempt = 0) => {
    const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (sel) {
      sel.value = target;
      sel.dispatchEvent(new Event("change"));
    } else if (attempt < 20) {
      setTimeout(() => trySelect(attempt + 1), 250);
    } else {
      // Fallback: reload so cookie-based translation takes effect.
      window.location.reload();
    }
  };
  trySelect();
}

export function LanguageManager() {
  useEffect(() => {
    const lang = localStorage.getItem("lang") ?? "fr";
    if (lang !== "fr") apply(lang);

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      apply(detail ?? localStorage.getItem("lang") ?? "fr");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lang") apply(e.newValue ?? "fr");
    };
    window.addEventListener("lang-change", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("lang-change", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
