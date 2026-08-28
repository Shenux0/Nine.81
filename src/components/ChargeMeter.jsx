export function ChargeMeter({ level, visible, isCharging, accentColor, guess, onGuess }) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 220,
          height: 16,
          borderRadius: 8,
          background: "#1C2B4A",
          overflow: "hidden",
          border: "1px solid #2A3A5C",
        }}
      >
        <div
          style={{
            width: `${Math.round(level * 100)}%`,
            height: "100%",
            background: accentColor,
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {isCharging && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onGuess("clear")}
            style={{
              padding: "6px 14px",
              borderRadius: 14,
              border: guess === "clear" ? `2px solid ${accentColor}` : "1px solid #2A3A5C",
              background: "#1B2436",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Will clear it
          </button>
          <button
            onClick={() => onGuess("miss")}
            style={{
              padding: "6px 14px",
              borderRadius: 14,
              border: guess === "miss" ? `2px solid ${accentColor}` : "1px solid #2A3A5C",
              background: "#1B2436",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Won't clear it
          </button>
        </div>
      )}

      <p style={{ margin: 0, color: "#C9D3E0", fontFamily: "system-ui, sans-serif", fontSize: 12, opacity: 0.75 }}>
        Hold SPACE to charge, release to jump
      </p>
    </div>
  );
}
