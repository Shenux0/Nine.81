import { COLORS } from "../theme";

const WORLD_FACTS = {
  Earth: `Earth's gravity, 9.81 m/s², is the baseline every other world is measured against.`,
  Moon: `The Moon's gravity is about 1/6th of Earth's. The exact same jump that barely lifts you on Earth sends you soaring roughly six times higher here.`,
  Jupiter: `Jupiter's gravity, measured at the cloud tops, is about 2.5x Earth's. The same jump barely gets you off the ground.`,
};

const GAME_COPY =
  "Hold SPACE to charge your jump, then release — land your peak height inside the glowing band to keep your streak alive. Each hit narrows the band; a miss resets it.";

export function WorldInfoPanel({ mode, world }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        top: "40%",
        zIndex: 10,
        maxWidth: 460,
        fontFamily: "system-ui, sans-serif",
        color: "white",
      }}
    >
      <h1 style={{ margin: "0 0 16px", fontSize: 34, fontWeight: 800, letterSpacing: 0.5 }}>
        THE {world.toUpperCase()}
      </h1>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: COLORS.textOnDark }}>
        {mode === "learn" ? `"${WORLD_FACTS[world]}"` : GAME_COPY}
      </p>
    </div>
  );
}
