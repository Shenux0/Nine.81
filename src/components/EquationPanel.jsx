import { COLORS } from "../theme";

function fmt(n) {
  return n == null ? null : n.toFixed(2);
}

export function EquationPanel({ mode, lastJump, g }) {
  let heading;
  if (mode === "learn") {
    heading = lastJump ? `h = v² / 2g = ${fmt(lastJump.measuredHeight)} m` : "h = v² / 2g";
  } else {
    heading =
      lastJump != null
        ? `Predicted ${fmt(lastJump.predictedHeight)}m · Measured ${fmt(lastJump.measuredHeight)}m`
        : "Predicted vs. Measured";
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 48,
        top: "26%",
        zIndex: 10,
        maxWidth: 440,
        textAlign: "right",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: 700,
          color: "white",
          textDecoration: "underline",
          textUnderlineOffset: "8px",
        }}
      >
        {heading}
      </h2>

      {mode === "learn" && g != null && (
        <p style={{ marginTop: 14, fontSize: 17, lineHeight: 1.5, color: COLORS.textOnDark }}>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>a = g = {fmt(g)} m/s² ↓</span>
          <br />
          Constant the whole jump — velocity drops by {fmt(g)} m/s every second.
        </p>
      )}

      {mode === "game" && lastJump && (
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            lineHeight: 1.5,
            color: lastJump.matches ? COLORS.textOnDark : COLORS.accent,
          }}
        >
          {lastJump.matches ? "Formula and engine agree — that's real physics, not a scripted animation." : "Mismatch — check the physics setup."}
        </p>
      )}
    </div>
  );
}
