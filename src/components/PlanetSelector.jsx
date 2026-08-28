export function PlanetSelector({ world, worlds, activeColor, onSelect }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        gap: 28,
        alignItems: "center",
      }}
    >
      {Object.keys(worlds).map((name) => {
        const active = world === name;
        return (
          <button
            key={name}
            onClick={() => onSelect(name)}
            style={{
              padding: active ? "10px 26px" : "10px 6px",
              borderRadius: 24,
              border: "none",
              background: active ? activeColor : "transparent",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 17,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
