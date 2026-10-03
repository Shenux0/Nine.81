import { COLORS } from "../theme";

function fmt(n) {
  return n.toFixed(2);
}

export function ChargeMeter({ level, visible, phase, accentColor, streak, bestStreak, lastHit, band }) {
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
      <p style={{ margin: 0, color: "white", fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 700 }}>
        Streak: {streak} · Best: {bestStreak}
      </p>

      {phase !== "idle" && band && (
        <p style={{ margin: 0, color: "#C9D3E0", fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
          Land between {fmt(band.min)}m – {fmt(band.max)}m
        </p>
      )}

      {phase === "idle" && lastHit != null && (
        <p
          style={{
            margin: 0,
            fontFamily: "system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: lastHit ? COLORS.success : COLORS.accent,
          }}
        >
          {lastHit ? "Hit! Band narrows." : "Missed — streak reset."}
        </p>
      )}

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

      <p style={{ margin: 0, color: "#C9D3E0", fontFamily: "system-ui, sans-serif", fontSize: 12, opacity: 0.75 }}>
        Hold SPACE to charge, release to jump
      </p>
    </div>
  );
}
