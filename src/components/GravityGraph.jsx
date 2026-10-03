import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS } from "../theme";

// Learn-mode comparison, shown as a full-screen popup over a blurred scene.
// The SAME launch speed on every world, only g differs. Two charts on one shared
// time axis (different units → two charts, never a dual axis):
//   v(t) = v0 − g·t        straight lines, same start, slope = −g  ← acceleration
//   h(t) = v0·t − ½·g·t²   the jump each world produces as a result

// Geometry is in viewBox units; the SVG scales to fit the popup.
const WIDTH = 1000;
const MARGIN = { left: 64, right: 24 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const CHART_H = 230;
const V_TOP = 62; // room for the chart title + the "same start" label below it
const H_TOP = V_TOP + CHART_H + 84;
const SVG_H = H_TOP + CHART_H + 36; // room for the time axis labels

const TEXT_MUTED = "rgba(255,255,255,0.55)";
const GRID = "rgba(255,255,255,0.1)";
const BASELINE = "rgba(255,255,255,0.35)";
const SURFACE = "#0B0F1A";
const CLOSE_MS = 220;

// Popup enter/exit + line "draw-in". Lines use pathLength=1 so one dash length fits any line.
const ANIMATION_CSS = `
@keyframes gg-fade-in { from { opacity: 0; backdrop-filter: blur(0); } to { opacity: 1; backdrop-filter: blur(10px); } }
@keyframes gg-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes gg-pop-in { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes gg-pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(16px) scale(0.97); } }
@keyframes gg-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes gg-appear { from { opacity: 0; } to { opacity: 1; } }
.gg-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: gg-draw 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.gg-late { opacity: 0; animation: gg-appear 300ms ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .gg-line, .gg-late { animation: none; stroke-dashoffset: 0; opacity: 1; }
  .gg-overlay, .gg-dialog { animation-duration: 1ms !important; }
}
`;

function niceStep(max, targetTicks = 4) {
  const raw = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

function ticks(max, step) {
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

export function GravityGraph({ worlds, colors, velocity, currentWorld, onClose }) {
  const [hoverT, setHoverT] = useState(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  // Play the exit animation, then let the parent unmount us.
  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const series = Object.entries(worlds).map(([name, g]) => ({
    name,
    g,
    flightTime: (2 * velocity) / g,
    peak: (velocity * velocity) / (2 * g),
  }));

  const tMax = Math.max(...series.map((s) => s.flightTime));
  const hMax = Math.max(...series.map((s) => s.peak));
  const tStep = niceStep(tMax, 8);
  const hStep = niceStep(hMax, 4);
  const tAxisMax = Math.ceil(tMax / tStep) * tStep;
  const hAxisMax = Math.ceil(hMax / hStep) * hStep;
  // Symmetric velocity axis on round numbers (e.g. −4…+4) so 0 always gets a gridline.
  const vStep = niceStep(velocity, 2);
  const vAxisMax = Math.ceil(velocity / vStep) * vStep;

  const x = (t) => MARGIN.left + (t / tAxisMax) * PLOT_W;
  const yV = (v) => V_TOP + ((vAxisMax - v) / (2 * vAxisMax)) * CHART_H;
  const yH = (h) => H_TOP + CHART_H - (h / hAxisMax) * CHART_H;

  function heightPath(s) {
    const steps = 96;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = (s.flightTime * i) / steps;
      const h = velocity * t - 0.5 * s.g * t * t;
      d += `${i === 0 ? "M" : "L"}${x(t).toFixed(1)},${yH(Math.max(0, h)).toFixed(1)}`;
    }
    return d;
  }

  // Draw the current world last so it sits on top; the others recede.
  const ordered = [...series.filter((s) => s.name !== currentWorld), ...series.filter((s) => s.name === currentWorld)];
  const current = series.find((s) => s.name === currentWorld);

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const t = ((px - MARGIN.left) / PLOT_W) * tAxisMax;
    setHoverT(t >= 0 && t <= tAxisMax ? t : null);
  }

  const vTicks = [];
  for (let v = -vAxisMax; v <= vAxisMax + 1e-9; v += vStep) vTicks.push(Number(v.toFixed(6)));

  return (
    <div
      className="gg-overlay"
      onClick={requestClose}
      style={{
        animation: `${closing ? "gg-fade-out" : "gg-fade-in"} ${closing ? CLOSE_MS : 280}ms ease-out forwards`,
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        fontFamily: "system-ui, sans-serif",
        color: "white",
      }}
    >
      <style>{ANIMATION_CSS}</style>
      <div
        className="gg-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Same jump, different gravity"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: closing
            ? `gg-pop-out ${CLOSE_MS}ms ease-in forwards`
            : "gg-pop-in 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          position: "relative",
          // Never scroll — size the popup so everything fits the viewport instead.
          // Height ≈ ~310px of fixed text/cards + the chart, whose height is
          // (popup width − 56px padding) × SVG_H / WIDTH. Solve for the width that fits 94vh.
          width: `min(1080px, 94vw, calc((94vh - 310px) * ${(WIDTH / SVG_H).toFixed(3)} + 56px))`,
          maxHeight: "94vh",
          overflow: "hidden",
          boxSizing: "border-box",
          padding: "24px 28px 20px",
          borderRadius: 18,
          background: "rgba(11,15,26,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <button
          onClick={requestClose}
          aria-label="Close graph"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <div style={{ fontSize: 26, fontWeight: 800 }}>Same jump, different gravity</div>
        <div style={{ fontSize: 15, color: COLORS.textOnDark, marginTop: 4 }}>
          Launch speed is <b>{velocity.toFixed(1)} m/s on every world</b> — only the acceleration g changes.
        </div>

        {/* Legend: identity is never colour-alone — name + g next to each swatch. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, margin: "16px 0 22px", fontSize: 14 }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, opacity: s.name === currentWorld ? 1 : 0.75 }}>
              <span style={{ width: 22, height: 4, borderRadius: 2, background: colors[s.name] }} />
              <span style={{ fontWeight: s.name === currentWorld ? 700 : 500 }}>{s.name}</span>
              <span style={{ color: TEXT_MUTED }}>g = {s.g} m/s²</span>
            </div>
          ))}
          <span style={{ color: TEXT_MUTED, marginLeft: "auto" }}>Hover the graph to read values</span>
        </div>

        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${WIDTH} ${SVG_H}`}
            width="100%"
            role="img"
            aria-label={`Velocity and height over time for a ${velocity} m/s jump on ${series.map((s) => `${s.name} (g ${s.g})`).join(", ")}`}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverT(null)}
            style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
          >
            {/* ---- Velocity chart ---- */}
            <text x={0} y={14} fill="white" fontSize={17} fontWeight={700}>
              Velocity (m/s)
              <tspan fill={TEXT_MUTED} fontWeight={500}> — the slope of each line is −g, the acceleration</tspan>
            </text>
            {vTicks.map((v) => (
              <g key={v}>
                <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yV(v)} y2={yV(v)} stroke={v === 0 ? BASELINE : GRID} />
                <text x={MARGIN.left - 10} y={yV(v) + 5} fill={TEXT_MUTED} fontSize={14} textAnchor="end">
                  {v > 0 ? `+${v}` : v}
                </text>
              </g>
            ))}
            {ordered.map((s, i) => (
              <line
                key={s.name}
                className="gg-line"
                pathLength={1}
                style={{ animationDelay: `${200 + i * 120}ms` }}
                x1={x(0)}
                y1={yV(velocity)}
                x2={x(s.flightTime)}
                y2={yV(-velocity)}
                stroke={colors[s.name]}
                strokeWidth={s.name === currentWorld ? 3.5 : 2.5}
                strokeOpacity={s.name === currentWorld ? 1 : 0.5}
                strokeLinecap="round"
              />
            ))}
            <circle cx={x(0)} cy={yV(velocity)} r={6} fill="white" stroke={SURFACE} strokeWidth={2} />
            <text x={x(0) + 12} y={yV(velocity) - 12} fill={COLORS.textOnDark} fontSize={14}>
              every world starts at +{velocity.toFixed(1)} m/s
            </text>
            <text x={WIDTH - MARGIN.right - 4} y={yV(0) - 8} fill={TEXT_MUTED} fontSize={13} textAnchor="end">
              v = 0 → top of the jump
            </text>

            {/* ---- Height chart ---- */}
            <text x={0} y={H_TOP - 26} fill="white" fontSize={17} fontWeight={700}>
              Height (m)
              <tspan fill={TEXT_MUTED} fontWeight={500}> — the jump that acceleration produces</tspan>
            </text>
            {ticks(hAxisMax, hStep).map((h) => (
              <g key={h}>
                <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yH(h)} y2={yH(h)} stroke={h === 0 ? BASELINE : GRID} />
                <text x={MARGIN.left - 10} y={yH(h) + 5} fill={TEXT_MUTED} fontSize={14} textAnchor="end">
                  {h}
                </text>
              </g>
            ))}
            {ordered.map((s, i) => (
              <path
                key={s.name}
                className="gg-line"
                pathLength={1}
                style={{ animationDelay: `${450 + i * 120}ms` }}
                d={heightPath(s)}
                fill="none"
                stroke={colors[s.name]}
                strokeWidth={s.name === currentWorld ? 3.5 : 2.5}
                strokeOpacity={s.name === currentWorld ? 1 : 0.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {/* Selective direct label: only the current world's peak. */}
            {current && (
              <g className="gg-late" style={{ animationDelay: "1300ms" }}>
                <circle
                  cx={x(current.flightTime / 2)}
                  cy={yH(current.peak)}
                  r={7}
                  fill={colors[current.name]}
                  stroke={SURFACE}
                  strokeWidth={2.5}
                />
                <text
                  x={x(current.flightTime / 2) + 14}
                  y={yH(current.peak) + (current.peak / hAxisMax > 0.8 ? 20 : -10)}
                  fill="white"
                  fontSize={15}
                  fontWeight={700}
                >
                  {current.name} peak {current.peak.toFixed(2)} m
                </text>
              </g>
            )}

            {/* ---- Shared time axis ---- */}
            {ticks(tAxisMax, tStep).map((t) => (
              <text key={t} x={x(t)} y={H_TOP + CHART_H + 22} fill={TEXT_MUTED} fontSize={14} textAnchor="middle">
                {t}s
              </text>
            ))}

            {/* ---- Crosshair across both charts ---- */}
            {hoverT != null && (
              <line
                x1={x(hoverT)}
                x2={x(hoverT)}
                y1={V_TOP}
                y2={H_TOP + CHART_H}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                pointerEvents="none"
              />
            )}
          </svg>

          {hoverT != null && (
            <div
              style={{
                position: "absolute",
                top: `${((V_TOP + CHART_H + 8) / SVG_H) * 100}%`,
                left: `${(x(hoverT) / WIDTH) * 100}%`,
                transform: x(hoverT) > WIDTH / 2 ? "translateX(calc(-100% - 14px))" : "translateX(14px)",
                width: 250,
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.15)",
                fontSize: 14,
                lineHeight: 1.6,
                pointerEvents: "none",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>t = {hoverT.toFixed(2)} s</div>
              {series.map((s) => {
                const landed = hoverT > s.flightTime;
                const v = velocity - s.g * hoverT;
                const h = velocity * hoverT - 0.5 * s.g * hoverT * hoverT;
                return (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[s.name], flexShrink: 0 }} />
                    <span style={{ width: 58 }}>{s.name}</span>
                    <span style={{ color: COLORS.textOnDark }}>
                      {landed ? "landed" : `v ${v >= 0 ? "+" : ""}${v.toFixed(2)} · h ${h.toFixed(2)} m`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-world numbers — readable without hovering. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          {series.map((s) => (
            <div
              key={s.name}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: s.name === currentWorld ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[s.name] }} />
                {s.name}
              </div>
              <div style={{ fontSize: 13, color: COLORS.textOnDark, marginTop: 4, lineHeight: 1.6 }}>
                Acceleration <b style={{ color: "white" }}>{s.g} m/s²</b>
                <br />
                Peak height <b style={{ color: "white" }}>{s.peak.toFixed(2)} m</b>
                <br />
                Time in the air <b style={{ color: "white" }}>{s.flightTime.toFixed(2)} s</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
