import { useState } from "react";

/*
 * A restrained line chart, not a "fintech chart": no gradient fill, no
 * axis numbers, no background grid, no load animation. One accent line,
 * a muted dashed reference at the period's starting value, the current
 * point emphasized, and a hover/tap tooltip. Built for the weight trend
 * specifically, but the shape (data = [{label, date, value}]) and the
 * CSS classes (.dp-linechart-*) are meant to be reused as-is for future
 * single-series health charts (calories, protein, exercise minutes,
 * goal progress) rather than each one inventing its own chart.
 */
const W = 300;
const H = 100;
const PAD_X = 6;
const PAD_TOP = 24;
const PAD_BOTTOM = 6;
const TOOLTIP_W = 66;
const TOOLTIP_H = 30;

export default function WeightChart({ data }) {
    const [hoverIndex, setHoverIndex] = useState(null);
    const [tapIndex, setTapIndex] = useState(null);
    const activeIndex = hoverIndex ?? tapIndex;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.min(...values) === Math.max(...values) ? min + 1 : Math.max(...values);
    const range = max - min;
    const plotH = H - PAD_TOP - PAD_BOTTOM;

    const x = (i) => PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2);
    const y = (v) => PAD_TOP + (1 - (v - min) / range) * plotH;

    const points = data.map((d, i) => [x(i), y(d.value)]);
    const linePath = points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const referenceY = y(data[0].value);
    const lastIndex = data.length - 1;

    const active = activeIndex !== null ? data[activeIndex] : null;
    const activeX = activeIndex !== null ? x(activeIndex) : 0;
    const tooltipX = Math.min(Math.max(activeX - TOOLTIP_W / 2, 2), W - TOOLTIP_W - 2);

    const first = data[0];
    const last = data[lastIndex];
    const summary = `${first.date}부터 ${last.date}까지, ${first.value}kg에서 ${last.value}kg (${(last.value - first.value).toFixed(1)}kg 변화)`;

    return (
        <div className="dp-linechart-wrap">
            <svg
                className="dp-linechart"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={summary}
                onMouseLeave={() => setHoverIndex(null)}
            >
                <line className="dp-linechart-reference" x1={PAD_X} y1={referenceY} x2={W - PAD_X} y2={referenceY} />
                <polyline className="dp-linechart-line" points={linePath} />

                {points.map(([px, py], i) => (
                    i !== lastIndex && <circle key={`dot-${i}`} className="dp-linechart-dot" cx={px} cy={py} r="2.5" />
                ))}
                <circle className="dp-linechart-dot-current" cx={points[lastIndex][0]} cy={points[lastIndex][1]} r="4.5" />

                {points.map(([px], i) => (
                    <rect
                        key={`hit-${i}`}
                        className="dp-linechart-hit"
                        x={Math.max(0, px - (W / data.length) / 2)}
                        y="0"
                        width={W / data.length}
                        height={H}
                        onMouseEnter={() => setHoverIndex(i)}
                        onClick={() => setTapIndex(tapIndex === i ? null : i)}
                    />
                ))}

                {active && (
                    <g style={{ pointerEvents: "none" }}>
                        <rect className="dp-linechart-tooltip-bg" x={tooltipX} y={4} width={TOOLTIP_W} height={TOOLTIP_H} rx="6" />
                        <text className="dp-linechart-tooltip-date" x={tooltipX + TOOLTIP_W / 2} y={16} textAnchor="middle">{active.date}</text>
                        <text className="dp-linechart-tooltip-value" x={tooltipX + TOOLTIP_W / 2} y={28} textAnchor="middle">{active.value.toFixed(1)}kg</text>
                    </g>
                )}
            </svg>

            <div className="dp-chart-labels">
                {data.map((d, i) => (
                    <span key={d.label + i} className={i === lastIndex ? "dp-highlight" : ""}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}
