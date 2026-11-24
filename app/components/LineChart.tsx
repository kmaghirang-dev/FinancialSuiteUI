'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';

export interface LineChartPoint {
    key: string;
    // X-axis tick; subLabel is a second, smaller line (hidden on narrow charts).
    label: string;
    subLabel?: string;
    // null = no data for this slot: no marker, and the line bridges it with a dashed segment.
    value: number | null;
    tooltipTitle: string;
    tooltipDetail?: string;
    // A distinct reference point (e.g. a starting baseline): hollow marker, dashed link to the next point.
    isReference?: boolean;
}

interface Props {
    title: string;
    subtitle?: string;
    points: LineChartPoint[];
    unit: string;
    emptyMessage: string;
    // Legend text for reference points, shown only when the data has one.
    referenceLabel?: string;
    // Legend and table label for the plotted values (default "Value").
    valueLabel?: string;
    // Formats tooltips, the latest-value label and the table (default "72.5 kg").
    format?: (value: number) => string;
    // Formats y-axis ticks (default plain numbers with the unit above the axis).
    formatTick?: (value: number) => string;
}

const HEIGHT = 252;
const MARGIN = { top: 32, right: 24, bottom: 44, left: 48 };
const NARROW_WIDTH = 520;

const niceStep = (range: number) => {
    const raw = range / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((x) => x * magnitude).find((x) => x >= raw);
    return step ?? 10 * magnitude;
};

const LineChart = ({ title, subtitle, points, unit, emptyMessage, referenceLabel, valueLabel = 'Value', format, formatTick }: Props) => {
    const formatValue = (value: number) => (format ? format(value) : `${value.toFixed(1)} ${unit}`);
    const formatShort = (value: number) => (format ? format(value) : value.toFixed(1));
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [active, setActive] = useState<number | null>(null);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const values = points.map((p) => p.value).filter((v): v is number => v !== null);
    const hasData = values.length > 0;
    const hasReference = points.some((p) => p.isReference && p.value !== null);

    // Y domain padded around the data and snapped to a readable step, so small changes stay visible.
    const min = hasData ? Math.min(...values) : 0;
    const max = hasData ? Math.max(...values) : 1;
    const step = niceStep(Math.max(max - min, 1));
    const yMin = Math.floor((min - step / 2) / step) * step;
    const yMax = Math.ceil((max + step / 2) / step) * step;
    const ticks: number[] = [];
    for (let t = yMin; t <= yMax + step / 1000; t += step) ticks.push(Number(t.toFixed(4)));

    const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const slot = points.length > 0 ? plotWidth / points.length : 0;
    const x = (index: number) => MARGIN.left + slot * (index + 0.5);
    const y = (value: number) => MARGIN.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    const narrow = width < NARROW_WIDTH;

    // Consecutive recorded points are joined solid; a link across a gap or out of a reference point is dashed.
    const segments: { from: number; to: number; dashed: boolean }[] = [];
    let previous: number | null = null;
    points.forEach((point, index) => {
        if (point.value === null) return;
        if (previous !== null) segments.push({ from: previous, to: index, dashed: index - previous > 1 || !!points[previous].isReference });
        previous = index;
    });

    const lastIndex = points.reduce((last, p, i) => (p.value !== null ? i : last), -1);
    const activePoint = active !== null ? points[active] : null;

    return (
        <div className="trend-chart">
            <div className="flex align-items-start justify-content-between gap-2 mb-2">
                <div>
                    <h5 className="m-0">{title}</h5>
                    {subtitle && <div className="text-sm text-color-secondary mt-1">{subtitle}</div>}
                </div>
                <Button
                    icon={showTable ? 'pi pi-chart-line' : 'pi pi-table'}
                    rounded
                    text
                    severity="secondary"
                    aria-label={showTable ? `Show ${title} chart` : `Show ${title} as a table`}
                    tooltip={showTable ? 'Show chart' : 'Show table'}
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => setShowTable((value) => !value)}
                />
            </div>

            {hasReference && referenceLabel && !showTable && (
                <div className="trend-chart-legend">
                    <span className="trend-chart-legend-item">
                        <span className="trend-chart-swatch" /> {valueLabel}
                    </span>
                    <span className="trend-chart-legend-item">
                        <span className="trend-chart-swatch trend-chart-swatch-reference" /> {referenceLabel}
                    </span>
                </div>
            )}

            {!hasData && <div className="trend-chart-empty">{emptyMessage}</div>}

            {hasData && showTable && (
                <table className="trend-chart-table">
                    <thead>
                        <tr>
                            <th scope="col">Period</th>
                            <th scope="col">{format ? valueLabel : `Value (${unit})`}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {points.map((point) => (
                            <tr key={point.key}>
                                <td>{point.tooltipTitle}</td>
                                <td>{point.value === null ? 'No entry' : formatShort(point.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div ref={containerRef} className="trend-chart-plot" hidden={!hasData || showTable} onMouseLeave={() => setActive(null)}>
                {width > 0 && (
                    <svg width={width} height={HEIGHT} role="img" aria-label={`${title} line chart`}>
                        {ticks.map((tick) => (
                            <g key={tick}>
                                <line className="trend-chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
                                <text className="trend-chart-axis" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                                    {formatTick ? formatTick(tick) : Number.isInteger(tick) ? tick : tick.toFixed(1)}
                                </text>
                            </g>
                        ))}
                        <text className="trend-chart-axis" x={MARGIN.left - 8} y={10} textAnchor="end">
                            {formatTick ? null : unit}
                        </text>

                        {points.map((point, index) => (
                            <text key={point.key} className="trend-chart-axis" x={x(index)} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle">
                                <tspan className={point.isReference ? 'trend-chart-axis-strong' : undefined}>{point.label}</tspan>
                                {point.subLabel && !narrow && (
                                    <tspan x={x(index)} dy="14">
                                        {point.subLabel}
                                    </tspan>
                                )}
                            </text>
                        ))}

                        {activePoint && active !== null && <line className="trend-chart-crosshair" x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />}

                        {segments.map((s) => (
                            <line key={`${s.from}-${s.to}`} className={s.dashed ? 'trend-chart-line trend-chart-line-dashed' : 'trend-chart-line'} x1={x(s.from)} y1={y(points[s.from].value!)} x2={x(s.to)} y2={y(points[s.to].value!)} />
                        ))}

                        {points.map((point, index) =>
                            point.value === null ? null : (
                                <circle key={point.key} className={point.isReference ? 'trend-chart-marker trend-chart-marker-reference' : 'trend-chart-marker'} cx={x(index)} cy={y(point.value)} r={active === index ? 6 : 4.5} />
                            )
                        )}

                        {lastIndex >= 0 && (
                            <text className="trend-chart-value" x={x(lastIndex)} y={y(points[lastIndex].value!) - 12} textAnchor="middle">
                                {formatShort(points[lastIndex].value!)}
                            </text>
                        )}

                        {/* Full-height hit areas, wider than the marks, one per slot. */}
                        {points.map((point, index) => (
                            <rect
                                key={point.key}
                                className="trend-chart-hit"
                                x={MARGIN.left + slot * index}
                                y={MARGIN.top}
                                width={slot}
                                height={plotHeight}
                                tabIndex={0}
                                aria-label={`${point.tooltipTitle}: ${point.value === null ? 'no entry' : formatValue(point.value)}`}
                                onMouseEnter={() => setActive(index)}
                                onFocus={() => setActive(index)}
                                onBlur={() => setActive(null)}
                            />
                        ))}
                    </svg>
                )}

                {activePoint && active !== null && (
                    <div
                        className="trend-chart-tooltip"
                        style={{
                            left: Math.min(Math.max(x(active), 80), width - 80),
                            top: activePoint.value === null ? MARGIN.top + plotHeight / 2 : y(activePoint.value)
                        }}
                    >
                        <div className="font-medium">{activePoint.tooltipTitle}</div>
                        <div className="trend-chart-tooltip-value">{activePoint.value === null ? 'No entry recorded' : formatValue(activePoint.value)}</div>
                        {activePoint.tooltipDetail && <div className="text-color-secondary">{activePoint.tooltipDetail}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LineChart;
