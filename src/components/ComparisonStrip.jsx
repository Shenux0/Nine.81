export function ComparisonStrip({ worlds, colors, comparisons, currentWorld }) {
  const heights = Object.values(comparisons)
    .map((c) => c?.last)
    .filter((h) => h != null);
  const maxHeight = Math.max(1, ...heights);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 48,
        zIndex: 10,
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {Object.keys(worlds).map((name) => {
        const value = comparisons[name]?.last;
        const barHeight = value != null ? Math.max(6, (value / maxHeight) * 70) : 4;
        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 48 }}>
            <p style={{ margin: "0 0 4px", color: "white", fontSize: 11, fontWeight: 700 }}>
              {value != null ? `${value.toFixed(2)}m` : "—"}
            </p>
            <div
              style={{
                width: 22,
                height: barHeight,
                borderRadius: 4,
                background: value != null ? colors[name] : "rgba(255,255,255,0.15)",
                border: currentWorld === name ? "2px solid white" : "none",
                transition: "height 0.3s ease",
              }}
            />
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{name}</p>
          </div>
        );
      })}
    </div>
  );
}
