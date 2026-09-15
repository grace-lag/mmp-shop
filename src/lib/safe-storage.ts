// Some browsers (Safari private mode, in-app webviews from Facebook/Google,
// devices with cookies disabled) throw on localStorage/sessionStorage access.
// An unguarded throw during render/effect blanks the whole app, so every read
// and write goes through these helpers.

export function lsGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function ssGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function ssSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore */
  }
}
