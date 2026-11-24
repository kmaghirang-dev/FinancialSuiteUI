import { ReactNode } from 'react';
import { CreditCardSummary } from '@/app/services/credit-card.service';
import { formatPeso, formatSignedPeso } from './format';

type Tone = 'down' | 'up' | 'neutral';

const toneOf = (debtChange: number): Tone => (debtChange < 0 ? 'down' : debtChange > 0 ? 'up' : 'neutral');

const SummaryCard = ({ label, icon, value, hint, tone }: { label: string; icon: string; value: ReactNode; hint: ReactNode; tone: Tone }) => (
    <div className={`card debt-summary-card tone-${tone}`}>
        <div className="debt-summary-label">
            <i className={icon} aria-hidden />
            {label}
        </div>
        <div className="debt-summary-value">{value}</div>
        <div className="debt-summary-hint">{hint}</div>
    </div>
);

interface Props {
    summary: CreditCardSummary;
    // e.g. "November 2026" or "All time".
    rangeLabel: string;
}

// The five headline numbers. Outstanding debt and overall reduction are as of today; the rest follow the selected period.
const DebtSummaryCards = ({ summary, rangeLabel }: Props) => {
    const reductionPercent = summary.debtReductionPercent;

    return (
        <div className="grid">
            <div className="col-12 md:col-6 xl:col">
                <SummaryCard label="Total outstanding debt" icon="pi pi-credit-card" value={formatPeso(summary.totalOutstanding)} hint={`Across ${summary.cardCount} card${summary.cardCount === 1 ? '' : 's'}, as of today`} tone="neutral" />
            </div>
            <div className="col-12 md:col-6 xl:col">
                <SummaryCard
                    label="Total payments"
                    icon="pi pi-wallet"
                    value={formatPeso(summary.totalPayments)}
                    hint={`${summary.paymentCount} payment${summary.paymentCount === 1 ? '' : 's'} · ${rangeLabel}`}
                    tone={summary.totalPayments > 0 ? 'down' : 'neutral'}
                />
            </div>
            <div className="col-12 md:col-6 xl:col">
                <SummaryCard
                    label="Estimated net card activity"
                    icon="pi pi-shopping-cart"
                    value={formatPeso(summary.estimatedNetActivity)}
                    hint={summary.completedPeriodCount === 0 ? `No completed statement periods · ${rangeLabel}` : `${summary.completedPeriodCount} completed period${summary.completedPeriodCount === 1 ? '' : 's'} · ${rangeLabel}`}
                    tone="neutral"
                />
            </div>
            <div className="col-12 md:col-6 xl:col">
                <SummaryCard
                    label="Net debt movement"
                    icon={summary.netDebtMovement < 0 ? 'pi pi-arrow-down' : summary.netDebtMovement > 0 ? 'pi pi-arrow-up' : 'pi pi-minus'}
                    value={formatSignedPeso(summary.netDebtMovement)}
                    hint={summary.netDebtMovement < 0 ? `Debt decreased · ${rangeLabel}` : summary.netDebtMovement > 0 ? `Debt increased · ${rangeLabel}` : `No change · ${rangeLabel}`}
                    tone={toneOf(summary.netDebtMovement)}
                />
            </div>
            <div className="col-12 md:col-6 xl:col">
                <SummaryCard
                    label="Overall debt reduction"
                    icon="pi pi-chart-line"
                    value={formatPeso(Math.abs(summary.debtReduction))}
                    hint={
                        reductionPercent === null
                            ? 'No initial debt recorded'
                            : summary.debtReduction >= 0
                            ? `${reductionPercent.toFixed(2)}% lower than the initial ${formatPeso(summary.initialTotalBalance)}`
                            : `${(-reductionPercent).toFixed(2)}% higher than the initial ${formatPeso(summary.initialTotalBalance)}`
                    }
                    tone={toneOf(-summary.debtReduction)}
                />
            </div>
        </div>
    );
};

export default DebtSummaryCards;
