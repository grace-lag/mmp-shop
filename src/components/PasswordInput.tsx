import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function PasswordInput(props: Props) {
  const [show, setShow] = useState(false);
  const { style, className, ...rest } = props;
  return (
    <div style={{ position: "relative" }}>
      <input
        {...rest}
        type={show ? "text" : "password"}
        className={className ?? "search-input"}
        style={{ paddingRight: 40, width: "100%", ...style }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {show ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
      </button>
    </div>
  );
}
