import { createServerFn } from "@tanstack/react-start";

// Server-side phone → email lookup so users can sign in with their phone number.
// Uses admin client because the `email`/`tel` columns are restricted from anon.
// Normalises the phone to digits-only before matching to be tolerant of formatting.
export const getEmailByPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => {
    const raw = String(input?.phone ?? "");
    const digits = raw.replace(/\D+/g, "");
    if (digits.length < 6 || digits.length > 20) throw new Error("Téléphone invalide");
    return { phone: raw, digits };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Match either the raw stored value or a digits-only variant
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("email, tel")
      .not("tel", "is", null)
      .neq("tel", "");
    if (error) throw new Error(error.message);
    const match = (rows ?? []).find(
      (r) => (r.tel ?? "").replace(/\D+/g, "") === data.digits,
    );
    if (!match?.email) throw new Error("Numéro de téléphone incorrect");
    return { email: match.email };
  });
