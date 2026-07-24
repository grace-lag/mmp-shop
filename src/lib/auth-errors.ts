// Translate common Supabase/auth error messages to French.
export function frAuthError(input: unknown): string {
  const msg = String((input as any)?.message ?? input ?? "").trim();
  if (!msg) return "Une erreur est survenue. Réessaie.";
  const m = msg.toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/invalid login credentials/, "Email ou mot de passe incorrect."],
    [/email not confirmed/, "Email non confirmé. Vérifie ta boîte mail."],
    [/user already registered|already registered|already exists/, "Un compte existe déjà avec cet email."],
    [/user not found/, "Aucun compte trouvé avec ces informations."],
    [/password should be at least (\d+)/, "Le mot de passe doit contenir au moins $1 caractères."],
    [/password.*(pwned|leaked|compromis)/, "Ce mot de passe est trop courant. Choisis-en un autre."],
    [/password.*(weak|strength)/, "Mot de passe trop faible."],
    [/rate limit|too many requests/, "Trop de tentatives. Réessaie dans quelques minutes."],
    [/network|fetch failed|failed to fetch/, "Problème de connexion réseau. Réessaie."],
    [/invalid email|email address.*invalid/, "Adresse email invalide."],
    [/invalid phone|phone.*invalid/, "Numéro de téléphone invalide."],
    [/token has expired|expired token|jwt expired/, "Le lien a expiré. Demande-en un nouveau."],
    [/invalid token|invalid jwt/, "Lien invalide ou expiré."],
    [/unauthorized|not authorized/, "Accès non autorisé. Connecte-toi."],
    [/signup.*disabled|signups.*disabled/, "Les inscriptions sont désactivées."],
    [/same as the old password/, "Le nouveau mot de passe doit être différent de l'ancien."],
    [/for security purposes.*(\d+) seconds/, "Pour des raisons de sécurité, patiente $1 secondes avant de réessayer."],
    [/otp|one.?time.?password/, "Code invalide ou expiré."],
    [/captcha/, "Vérification anti-robot échouée. Réessaie."],
    [/permission denied for table ([\w_]+)/, "Accès refusé à la table « $1 ». Reconnecte-toi et réessaie."],
    [/permission denied|not allowed|forbidden/, "Action non autorisée."],
    [/row-level security|violates row-level security policy/, "Action bloquée par la politique de sécurité."],
    [/duplicate key value|already exists/, "Cet élément existe déjà."],
    [/violates foreign key/, "Référence invalide : élément lié introuvable."],
    [/violates not-null constraint|null value in column/, "Un champ obligatoire est manquant."],
    [/violates check constraint/, "Une valeur saisie n'est pas valide."],
    [/value too long/, "Une valeur saisie est trop longue."],
    [/invalid input syntax/, "Format de donnée invalide."],
    [/could not connect|connection refused|timeout/, "Connexion au serveur impossible. Réessaie."],
    [/storage.*(not found|no such)/, "Fichier introuvable."],
    [/payload too large|file too large/, "Fichier trop volumineux."],
    [/mime type|content-type/, "Type de fichier non autorisé."],
    [/bucket/, "Erreur de stockage. Réessaie."],
    [/internal server error|unexpected/, "Erreur interne. Réessaie."],
    [/no rows|not found|introuvable/, "Élément introuvable."],
  ];

  for (const [re, fr] of rules) {
    const match = msg.match(re);
    if (match) return fr.replace(/\$(\d+)/g, (_, i) => match[Number(i)] ?? "");
  }
  return msg;
}
