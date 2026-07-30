import { toast } from "sonner";

export async function shareLink(opts: { title?: string; text?: string; url: string }) {
  const { title, text, url } = opts;
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share({ title, text, url });
      return;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papiers");
  } catch {
    toast.error("Partage indisponible sur cet appareil");
  }
}
