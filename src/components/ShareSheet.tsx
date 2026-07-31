import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Share2, Link2, Check } from "lucide-react";

type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  text?: string;
  url: string;
};

export function ShareSheet({ open, onClose, title, text, url }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (open) {
      setCanShare(typeof navigator !== "undefined" && typeof (navigator as any).share === "function");
      setCopied(false);
    }
  }, [open]);

  const handleNativeShare = async () => {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
      } else {
        await copyLink();
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      await copyLink();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const shareViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text ?? ""}\n${url}`)}`, "_blank");
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const shareViaSMS = () => {
    window.open(`sms:?&body=${encodeURIComponent(`${text ?? ""} ${url}`)}`, "_blank");
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 520,
          borderRadius: "20px 20px 0 0",
          padding: 20,
          animation: "slideUp 0.2s ease-out",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Partager</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={24} color="#64748b" />
          </button>
        </div>

        <div
          style={{
            background: "#f8fafc",
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            wordBreak: "break-all",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>
            {title || "Lien à partager"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{url}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <ShareAppButton
            icon="📱"
            label="WhatsApp"
            onClick={shareViaWhatsApp}
            color="#25D366"
          />
          <ShareAppButton
            icon="📘"
            label="Facebook"
            onClick={shareViaFacebook}
            color="#1877F3"
          />
          <ShareAppButton
            icon="💬"
            label="SMS"
            onClick={shareViaSMS}
            color="#64748b"
          />
          <ShareAppButton
            icon={canShare ? <Share2 size={22} color="#fff" /> : <Link2 size={22} color="#fff" />}
            label={canShare ? "Autres" : "Copier"}
            onClick={canShare ? handleNativeShare : copyLink}
            color="#0f172a"
          />
        </div>

        <button
          onClick={copyLink}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: copied ? "#dcfce7" : "#fff",
            color: copied ? "#166534" : "#0f172a",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {copied ? <Check size={18} /> : <Link2 size={18} />}
          {copied ? "Lien copié !" : "Copier le lien"}
        </button>

        {canShare && (
          <button
            onClick={handleNativeShare}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: "#ea580c",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Share2 size={18} />
            Voir les applications de l'appareil
          </button>
        )}
      </div>
    </div>
  );
}

function ShareAppButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: 8,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          color: "#fff",
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 500 }}>{label}</span>
    </button>
  );
}
