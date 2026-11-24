'use client';
import { ProgressBar } from 'primereact/progressbar';
import BarChart, { BarChartPoint } from '@/app/components/BarChart';
import LineChart, { LineChartPoint } from '@/app/components/LineChart';
import { CreditCardOverview } from '@/app/services/credit-card.service';
import { formatCompactPeso, formatDate, formatMonth, formatPeso, formatSignedPeso, movementClass } from './format';

const monthParts = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(year, monthNumber - 1, 1);
    return { label: date.toLocaleDateString('en-US', { month: 'short' }), subLabel: String(year) };
};

const periods = (count: number) => `${count} statement period${count === 1 ? '' : 's'}`;

export const BalanceTrendChart = ({ overview }: { overview: CreditCardOverview }) => {
    const points: LineChartPoint[] = overview.balanceTrend.map((point) =>
        point.isCurrent
            ? { key: 'now', label: 'Now', subLabel: formatDate(point.date).replace(/, \d{4}$/, ''), value: point.balance, tooltipTitle: `Today (${formatDate(point.date)})`, tooltipDetail: 'Latest SOA balance minus payments made since' }
            : { key: point.month, ...monthParts(point.month), value: point.balance, tooltipTitle: `End of ${formatMonth(point.month)}`, tooltipDetail: 'Latest statement balance at month end' }
    );
    const first = points[0]?.value ?? null;
    const last = points[points.length - 1]?.value ?? null;
    const change = first !== null && last !== null && points.length > 1 ? last - first : null;

    return (
        <LineChart
            title="Outstanding balance trend"
            subtitle={change === null ? 'Statement balances over time' : `${change <= 0 ? 'Down' : 'Up'} ${formatPeso(Math.abs(change))} over the period shown`}
            points={points}
            unit="₱"
            valueLabel="Outstanding balance"
            format={formatPeso}
            formatTick={formatCompactPeso}
            emptyMessage="No balances to show yet."
        />
    );
};

const periodPoints = (overview: CreditCardOverview, values: (t: CreditCardOverview['periodTotals'][number]) => (number | null)[]): BarChartPoint[] =>
    overview.periodTotals.map((t) => ({ key: t.month, ...monthParts(t.month), values: values(t), tooltipTitle: `Statements cut off in ${formatMonth(t.month)}`, tooltipDetail: periods(t.periodCount) }));

const EMPTY_PERIODS = 'No completed statement periods in this range. A period completes when its next SOA is recorded.';

export const NetActivityChart = ({ overview }: { overview: CreditCardOverview }) => (
    <BarChart
        title="Estimated net activity"
        subtitle="Per completed statement period (purchases, interest, fees less refunds and credits)"
        series={[{ key: 'activity', label: 'Est. net activity', className: 'bar-fill-activity' }]}
        points={periodPoints(overview, (t) => [t.estimatedNetActivity])}
        format={formatPeso}
        formatTick={formatCompactPeso}
        emptyMessage={EMPTY_PERIODS}
    />
);

export const PaymentHistoryChart = ({ overview }: { overview: CreditCardOverview }) => (
    <BarChart
        title="Payment history"
        subtitle="Total payments per completed statement period"
        series={[{ key: 'payments', label: 'Payments', className: 'bar-fill-payments' }]}
        points={periodPoints(overview, (t) => [t.totalPayments])}
        format={formatPeso}
        formatTick={formatCompactPeso}
        emptyMessage={EMPTY_PERIODS}
    />
);

export const PaymentVsActivityChart = ({ overview }: { overview: CreditCardOverview }) => (
    <BarChart
        title="Payments vs. estimated net activity"
        subtitle="When payments outpace activity, the debt goes down"
        series={[
            { key: 'payments', label: 'Payments', className: 'bar-fill-payments' },
            { key: 'activity', label: 'Est. net activity', className: 'bar-fill-activity' }
        ]}
        points={periodPoints(overview, (t) => [t.totalPayments, t.estimatedNetActivity])}
        format={formatPeso}
        formatTick={formatCompactPeso}
        emptyMessage={EMPTY_PERIODS}
    />
);

export const NetMovementChart = ({ overview }: { overview: CreditCardOverview }) => (
    <BarChart
        title="Net debt movement"
        subtitle="Closing minus opening balance per period; below zero means the debt went down"
        series={[{ key: 'movement', label: 'Net debt movement', className: 'bar-fill-neutral', signClassName: { positive: 'bar-fill-up', negative: 'bar-fill-down' } }]}
        points={periodPoints(overview, (t) => [t.netDebtMovement])}
        format={formatSignedPeso}
        formatTick={formatCompactPeso}
        emptyMessage={EMPTY_PERIODS}
    />
);

const progressValue = (percent: number | null) => (percent === null ? 0 : Math.max(0, Math.min(100, percent)));

// Initial debt against today's outstanding debt, combined and per card.
export const DebtReductionProgress = ({ overview }: { overview: CreditCardOverview }) => {
    const { summary } = overview;
    const increased = summary.debtReduction < 0;

    return (
        <div className="trend-chart">
            <h5 className="m-0">Debt reduction progress</h5>
            <div className="text-sm text-color-secondary mt-1 mb-3">From each card&apos;s initial balance to what you owe now</div>

            <div className={`debt-progress mb-2 ${increased ? 'debt-progress-up' : ''}`}>
                <div className="flex justify-content-between align-items-end mb-2">
                    <span className={`text-2xl font-semibold ${movementClass(-summary.debtReduction)}`}>
                        {summary.debtReductionPercent === null ? '—' : `${Math.abs(summary.debtReductionPercent).toFixed(2)}%`} {increased ? 'higher' : 'reduced'}
                    </span>
                    <span className={movementClass(-summary.debtReduction)}>{formatPeso(Math.abs(summary.debtReduction))}</span>
                </div>
                <ProgressBar value={progressValue(increased ? -(summary.debtReductionPercent ?? 0) : summary.debtReductionPercent)} showValue={false} aria-label="Overall debt reduction" />
                <div className="flex justify-content-between text-xs text-color-secondary mt-1">
                    <span>Initial {formatPeso(summary.initialTotalBalance)}</span>
                    <span>Now {formatPeso(summary.totalOutstanding)}</span>
                </div>
            </div>

            {overview.cards.length > 1 && (
                <div className="mt-4 flex flex-column gap-3">
                    {overview.cards.map((card) => {
                        const up = card.debtReduction < 0;
                        return (
                            <div key={card.creditCardId} className={`debt-progress ${up ? 'debt-progress-up' : ''}`}>
                                <div className="flex justify-content-between text-sm mb-1">
                                    <span className="font-medium">{card.displayName}</span>
                                    <span className={movementClass(-card.debtReduction)}>{card.debtReductionPercent === null ? '—' : `${Math.abs(card.debtReductionPercent).toFixed(1)}% ${up ? 'higher' : 'reduced'}`}</span>
                                </div>
                                <ProgressBar value={progressValue(up ? -(card.debtReductionPercent ?? 0) : card.debtReductionPercent)} showValue={false} style={{ height: '0.5rem' }} aria-label={`${card.displayName} debt reduction`} />
                                <div className="flex justify-content-between text-xs text-color-secondary mt-1">
                                    <span>{formatPeso(card.initialBalance)}</span>
                                    <span>{formatPeso(card.currentOutstanding)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
