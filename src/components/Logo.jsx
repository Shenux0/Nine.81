export function Logo({ sessionJumps }) {
  return (
    <div style={{ position: "absolute", top: 24, left: 32, zIndex: 10, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, color: "white" }}>
        <span style={{ fontWeight: 800, fontSize: 22 }}>Nine</span>
        <span style={{ fontWeight: 800, fontSize: 22 }}>.</span>
        <span style={{ fontWeight: 800, fontSize: 22 }}>81</span>
      </div>
      {sessionJumps != null && (
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.45, color: "white" }}>
          session jumps: {sessionJumps}
        </p>
      )}
    </div>
  );
}
