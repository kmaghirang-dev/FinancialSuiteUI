'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';

export interface BarSeries {
    key: string;
    label: string;
    // Fill class for the series' bars and legend swatch.
    className: string;
    // Overrides className per bar by sign, e.g. red for an increase and green for a decrease.
    signClassName?: { positive: string; negative: string };
}

export interface BarChartPoint {
    key: string;
    label: string;
    subLabel?: string;
    // One value per series, in series order; null draws no bar.
    values: (number | null)[];
    tooltipTitle: string;
    tooltipDetail?: string;
}

interface Props {
    title: string;
    subtitle?: string;
    series: BarSeries[];
    points: BarChartPoint[];
    emptyMessage: string;
    format: (value: number) => string;
    formatTick?: (value: number) => string;
}

const HEIGHT = 252;
const MARGIN = { top: 24, right: 16, bottom: 44, left: 56 };
const NARROW_WIDTH = 520;

const niceStep = (range: number) => {
    const raw = range / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((x) => x * magnitude).find((x) => x >= raw);
    return step ?? 10 * magnitude;
};

// Grouped bars from a zero baseline, so negative values hang below it.
const BarChart = ({ title, subtitle, series, points, emptyMessage, format, formatTick = format }: Props) => {
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

    const values = points.flatMap((p) => p.values).filter((v): v is number => v !== null);
    const hasData = values.length > 0;

    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const step = niceStep(Math.max(max - min, 1));
    const yMin = Math.floor(min / step) * step;
    const yMax = Math.max(Math.ceil(max / step) * step, yMin + step);
    const ticks: number[] = [];
    for (let t = yMin; t <= yMax + step / 1000; t += step) ticks.push(Number(t.toFixed(4)));

    const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 0);
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const slot = points.length > 0 ? plotWidth / points.length : 0;
    const groupWidth = Math.min(slot * 0.7, 28 * series.length);
    const barWidth = series.length > 0 ? groupWidth / series.length : 0;
    const y = (value: number) => MARGIN.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    const narrow = width < NARROW_WIDTH;
    const activePoint = active !== null ? points[active] : null;

    const barClass = (s: BarSeries, value: number) => (s.signClassName ? (value < 0 ? s.signClassName.negative : value > 0 ? s.signClassName.positive : s.className) : s.className);

    return (
        <div className="trend-chart">
            <div className="flex align-items-start justify-content-between gap-2 mb-2">
                <div>
                    <h5 className="m-0">{title}</h5>
                    {subtitle && <div className="text-sm text-color-secondary mt-1">{subtitle}</div>}
                </div>
                <Button
                    icon={showTable ? 'pi pi-chart-bar' : 'pi pi-table'}
                    rounded
                    text
                    severity="secondary"
                    aria-label={showTable ? `Show ${title} chart` : `Show ${title} as a table`}
                    tooltip={showTable ? 'Show chart' : 'Show table'}
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => setShowTable((value) => !value)}
                />
            </div>

            {hasData && !showTable && (series.length > 1 || series[0]?.signClassName) && (
                <div className="trend-chart-legend">
                    {series.map((s) =>
                        s.signClassName ? (
                            <span key={s.key} className="flex gap-3">
                                <span className="trend-chart-legend-item">
                                    <span className={`bar-chart-swatch ${s.signClassName.positive}`} /> Increase
                                </span>
                                <span className="trend-chart-legend-item">
                                    <span className={`bar-chart-swatch ${s.signClassName.negative}`} /> Decrease
                                </span>
                            </span>
                        ) : (
                            <span key={s.key} className="trend-chart-legend-item">
                                <span className={`bar-chart-swatch ${s.className}`} /> {s.label}
                            </span>
                        )
                    )}
                </div>
            )}

            {!hasData && <div className="trend-chart-empty">{emptyMessage}</div>}

            {hasData && showTable && (
                <table className="trend-chart-table">
                    <thead>
                        <tr>
                            <th scope="col">Period</th>
                            {series.map((s) => (
                                <th key={s.key} scope="col">
                                    {s.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {points.map((point) => (
                            <tr key={point.key}>
                                <td>{point.tooltipTitle}</td>
                                {point.values.map((value, i) => (
                                    <td key={series[i].key}>{value === null ? '—' : format(value)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div ref={containerRef} className="trend-chart-plot" hidden={!hasData || showTable} onMouseLeave={() => setActive(null)}>
                {width > 0 && (
                    <svg width={width} height={HEIGHT} role="img" aria-label={`${title} bar chart`}>
                        {ticks.map((tick) => (
                            <g key={tick}>
                                <line className={tick === 0 ? 'bar-chart-zero' : 'trend-chart-grid'} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
                                <text className="trend-chart-axis" x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                                    {formatTick(tick)}
                                </text>
                            </g>
                        ))}

                        {points.map((point, index) => {
                            const center = MARGIN.left + slot * (index + 0.5);
                            return (
                                <g key={point.key}>
                                    {active === index && <rect className="bar-chart-highlight" x={MARGIN.left + slot * index} y={MARGIN.top} width={slot} height={plotHeight} />}
                                    {point.values.map((value, i) =>
                                        value === null ? null : (
                                            <rect
                                                key={series[i].key}
                                                className={`bar-chart-bar ${barClass(series[i], value)}`}
                                                x={center - groupWidth / 2 + barWidth * i + 1}
                                                y={Math.min(y(value), y(0))}
                                                width={Math.max(barWidth - 2, 1)}
                                                height={Math.max(Math.abs(y(value) - y(0)), 1)}
                                                rx={2}
                                            />
                                        )
                                    )}
                                    <text className="trend-chart-axis" x={center} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle">
                                        <tspan>{point.label}</tspan>
                                        {point.subLabel && !narrow && (
                                            <tspan x={center} dy="14">
                                                {point.subLabel}
                                            </tspan>
                                        )}
                                    </text>
                                    <rect
                                        className="trend-chart-hit"
                                        x={MARGIN.left + slot * index}
                                        y={MARGIN.top}
                                        width={slot}
                                        height={plotHeight}
                                        tabIndex={0}
                                        aria-label={`${point.tooltipTitle}: ${point.values.map((v, i) => `${series[i].label} ${v === null ? 'none' : format(v)}`).join(', ')}`}
                                        onMouseEnter={() => setActive(index)}
                                        onFocus={() => setActive(index)}
                                        onBlur={() => setActive(null)}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                )}

                {activePoint && active !== null && (
                    <div className="trend-chart-tooltip" style={{ left: Math.min(Math.max(MARGIN.left + slot * (active + 0.5), 90), width - 90), top: MARGIN.top + plotHeight / 2 }}>
                        <div className="font-medium">{activePoint.tooltipTitle}</div>
                        {activePoint.values.map((value, i) => (
                            <div key={series[i].key} className="flex align-items-center gap-2">
                                <span className={`bar-chart-swatch ${value === null ? series[i].className : barClass(series[i], value)}`} />
                                <span className="text-color-secondary">{series[i].label}</span>
                                <span className="trend-chart-tooltip-value ml-auto">{value === null ? '—' : format(value)}</span>
                            </div>
                        ))}
                        {activePoint.tooltipDetail && <div className="text-color-secondary">{activePoint.tooltipDetail}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BarChart;
