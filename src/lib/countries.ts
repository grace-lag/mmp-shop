// Liste des pays avec drapeau emoji et indicatif téléphonique
export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "CG", name: "Congo-Brazzaville", dial: "242", flag: "🇨🇬" },
  { code: "CD", name: "Congo (RDC)", dial: "243", flag: "🇨🇩" },
  { code: "CM", name: "Cameroun", dial: "237", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", dial: "241", flag: "🇬🇦" },
  { code: "CF", name: "Centrafrique", dial: "236", flag: "🇨🇫" },
  { code: "TD", name: "Tchad", dial: "235", flag: "🇹🇩" },
  { code: "AO", name: "Angola", dial: "244", flag: "🇦🇴" },
  { code: "GQ", name: "Guinée équatoriale", dial: "240", flag: "🇬🇶" },
  { code: "CI", name: "Côte d'Ivoire", dial: "225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", dial: "221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", dial: "223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dial: "226", flag: "🇧🇫" },
  { code: "BJ", name: "Bénin", dial: "229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", dial: "228", flag: "🇹🇬" },
  { code: "NE", name: "Niger", dial: "227", flag: "🇳🇪" },
  { code: "GN", name: "Guinée", dial: "224", flag: "🇬🇳" },
  { code: "GH", name: "Ghana", dial: "233", flag: "🇬🇭" },
  { code: "NG", name: "Nigéria", dial: "234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "254", flag: "🇰🇪" },
  { code: "TZ", name: "Tanzanie", dial: "255", flag: "🇹🇿" },
  { code: "UG", name: "Ouganda", dial: "256", flag: "🇺🇬" },
  { code: "RW", name: "Rwanda", dial: "250", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", dial: "257", flag: "🇧🇮" },
  { code: "ET", name: "Éthiopie", dial: "251", flag: "🇪🇹" },
  { code: "ZA", name: "Afrique du Sud", dial: "27", flag: "🇿🇦" },
  { code: "MA", name: "Maroc", dial: "212", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", dial: "213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", dial: "216", flag: "🇹🇳" },
  { code: "EG", name: "Égypte", dial: "20", flag: "🇪🇬" },
  { code: "LY", name: "Libye", dial: "218", flag: "🇱🇾" },
  { code: "MR", name: "Mauritanie", dial: "222", flag: "🇲🇷" },
  { code: "MG", name: "Madagascar", dial: "261", flag: "🇲🇬" },
  { code: "MU", name: "Maurice", dial: "230", flag: "🇲🇺" },
  { code: "FR", name: "France", dial: "33", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", dial: "32", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", dial: "41", flag: "🇨🇭" },
  { code: "LU", name: "Luxembourg", dial: "352", flag: "🇱🇺" },
  { code: "DE", name: "Allemagne", dial: "49", flag: "🇩🇪" },
  { code: "IT", name: "Italie", dial: "39", flag: "🇮🇹" },
  { code: "ES", name: "Espagne", dial: "34", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "GB", name: "Royaume-Uni", dial: "44", flag: "🇬🇧" },
  { code: "IE", name: "Irlande", dial: "353", flag: "🇮🇪" },
  { code: "NL", name: "Pays-Bas", dial: "31", flag: "🇳🇱" },
  { code: "SE", name: "Suède", dial: "46", flag: "🇸🇪" },
  { code: "NO", name: "Norvège", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Danemark", dial: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finlande", dial: "358", flag: "🇫🇮" },
  { code: "PL", name: "Pologne", dial: "48", flag: "🇵🇱" },
  { code: "CZ", name: "Tchéquie", dial: "420", flag: "🇨🇿" },
  { code: "AT", name: "Autriche", dial: "43", flag: "🇦🇹" },
  { code: "GR", name: "Grèce", dial: "30", flag: "🇬🇷" },
  { code: "RO", name: "Roumanie", dial: "40", flag: "🇷🇴" },
  { code: "RU", name: "Russie", dial: "7", flag: "🇷🇺" },
  { code: "TR", name: "Turquie", dial: "90", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", dial: "380", flag: "🇺🇦" },
  { code: "US", name: "États-Unis", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dial: "1", flag: "🇨🇦" },
  { code: "MX", name: "Mexique", dial: "52", flag: "🇲🇽" },
  { code: "BR", name: "Brésil", dial: "55", flag: "🇧🇷" },
  { code: "AR", name: "Argentine", dial: "54", flag: "🇦🇷" },
  { code: "CL", name: "Chili", dial: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colombie", dial: "57", flag: "🇨🇴" },
  { code: "PE", name: "Pérou", dial: "51", flag: "🇵🇪" },
  { code: "CN", name: "Chine", dial: "86", flag: "🇨🇳" },
  { code: "JP", name: "Japon", dial: "81", flag: "🇯🇵" },
  { code: "KR", name: "Corée du Sud", dial: "82", flag: "🇰🇷" },
  { code: "IN", name: "Inde", dial: "91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩" },
  { code: "ID", name: "Indonésie", dial: "62", flag: "🇮🇩" },
  { code: "MY", name: "Malaisie", dial: "60", flag: "🇲🇾" },
  { code: "SG", name: "Singapour", dial: "65", flag: "🇸🇬" },
  { code: "TH", name: "Thaïlande", dial: "66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dial: "84", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", dial: "63", flag: "🇵🇭" },
  { code: "AE", name: "Émirats arabes unis", dial: "971", flag: "🇦🇪" },
  { code: "SA", name: "Arabie saoudite", dial: "966", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", dial: "974", flag: "🇶🇦" },
  { code: "KW", name: "Koweït", dial: "965", flag: "🇰🇼" },
  { code: "IL", name: "Israël", dial: "972", flag: "🇮🇱" },
  { code: "LB", name: "Liban", dial: "961", flag: "🇱🇧" },
  { code: "JO", name: "Jordanie", dial: "962", flag: "🇯🇴" },
  { code: "AU", name: "Australie", dial: "61", flag: "🇦🇺" },
  { code: "NZ", name: "Nouvelle-Zélande", dial: "64", flag: "🇳🇿" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Congo-Brazzaville (+242)

export function findCountryByDial(dial: string): Country | undefined {
  return COUNTRIES.find((c) => c.dial === dial);
}

/** Sépare un numéro complet "242066123..." en {dial, local}. Renvoie défaut si non reconnu. */
export function splitPhone(full: string): { country: Country; local: string } {
  const digits = (full || "").replace(/\D/g, "");
  // Essayer les indicatifs du plus long au plus court (4→1)
  for (let len = 4; len >= 1; len--) {
    const head = digits.slice(0, len);
    const c = COUNTRIES.find((x) => x.dial === head);
    if (c) return { country: c, local: digits.slice(len) };
  }
  return { country: DEFAULT_COUNTRY, local: digits };
}
