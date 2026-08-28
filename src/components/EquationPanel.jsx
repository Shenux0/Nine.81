import { COLORS } from "../theme";

function fmt(n) {
  return n == null ? null : n.toFixed(2);
}

export function EquationPanel({ mode, lastJump }) {
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

      {mode === "game" && lastJump?.guessCorrect != null && (
        <p style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: lastJump.guessCorrect ? COLORS.success : COLORS.accent }}>
          {lastJump.guessCorrect ? "Your prediction was correct!" : "Your prediction was wrong."}
        </p>
      )}
    </div>
  );
}
