'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Row } from 'primereact/row';
import PageHeader from '@/app/components/PageHeader';
import CreditCardFilterBar, { initialFilter, toDateRange, useCreditCards } from '@/app/components/credit-card/CreditCardFilterBar';
import { DebtReductionProgress, NetMovementChart, PaymentVsActivityChart } from '@/app/components/credit-card/CreditCardCharts';
import DebtSummaryCards from '@/app/components/credit-card/DebtSummaryCards';
import StatementHistoryTable, { historyRows } from '@/app/components/credit-card/StatementHistoryTable';
import { formatPeso, formatSignedPeso, movementClass } from '@/app/components/credit-card/format';
import { CreditCardOverview, creditCardService } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';

const MonthlyAnalysisPage = () => {
    const { showError } = useToast();
    const [filter, setFilter] = useState(initialFilter);
    const { cards } = useCreditCards(true);
    const [overview, setOverview] = useState<CreditCardOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const range = toDateRange(filter);

    const load = useCallback(() => {
        setLoading(true);
        creditCardService
            .getOverview({ creditCardId: filter.creditCardId || undefined, from: range.from, to: range.to })
            .then(setOverview)
            .catch(showError)
            .finally(() => setLoading(false));
    }, [filter.creditCardId, range.from, range.to, showError]);

    useEffect(load, [load]);

    // The baseline row only makes sense when the whole history is shown.
    const allTime = !range.from && !range.to;
    const multipleCards = (overview?.cards.length ?? 0) > 1;
    // Chronological across cards: baselines first, completed periods by cutoff, open periods last.
    const rank = { baseline: 0, completed: 1, open: 2 };
    const rows = (overview?.cards ?? []).flatMap((card) => historyRows(card, allTime)).sort((a, b) => rank[a.kind] - rank[b.kind] || a.sortDate.localeCompare(b.sortDate));
    const completedPeriods = (overview?.cards ?? []).flatMap((card) => card.periods);

    const s = overview?.summary;
    const leadingColumns = multipleCards ? 3 : 2;
    const footer = s && completedPeriods.length > 0 && (
        <ColumnGroup>
            <Row>
                <Column footer={`Completed periods (${s.completedPeriodCount})`} colSpan={leadingColumns} footerStyle={{ textAlign: 'left' }} />
                <Column footer={formatPeso(completedPeriods.reduce((sum, p) => sum + p.totalPayments, 0))} footerStyle={{ textAlign: 'right' }} />
                <Column footer={formatPeso(s.estimatedNetActivity)} footerStyle={{ textAlign: 'right' }} />
                <Column footer="" />
                <Column footer={<span className={movementClass(s.netDebtMovement)}>{formatSignedPeso(s.netDebtMovement)}</span>} footerStyle={{ textAlign: 'right' }} />
                <Column footer="" />
            </Row>
        </ColumnGroup>
    );

    return (
        <>
            <PageHeader title="Monthly Analysis" description="Payments, estimated net activity and debt movement for each statement period." icon="pi pi-chart-bar" />

            <div className="card">
                <div className="flex flex-column md:flex-row md:align-items-end md:justify-content-between gap-3">
                    <CreditCardFilterBar value={filter} onChange={setFilter} cards={cards} />
                    <Button icon="pi pi-refresh" severity="info" tooltip="Refresh" tooltipOptions={{ position: 'top' }} onClick={load} aria-label="Refresh" />
                </div>
            </div>

            {loading && !overview ? (
                <div className="flex justify-content-center p-5">
                    <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
                </div>
            ) : (
                overview && (
                    <>
                        <DebtSummaryCards summary={overview.summary} rangeLabel={range.label} />

                        <div className="card mt-2">
                            <h5 className="mt-0">Statement period analysis · {range.label}</h5>
                            <StatementHistoryTable rows={rows} showCard={multipleCards} footer={footer} emptyMessage="No statement periods in this range." />
                            <p className="text-xs text-color-secondary mb-0 mt-3">
                                A period&apos;s activity is the estimated net activity between two consecutive statements, not necessarily one calendar month of purchases. Periods count toward the range their cutoff date falls in.
                            </p>
                        </div>

                        <div className="grid">
                            <div className="col-12 xl:col-6">
                                <PaymentVsActivityChart overview={overview} />
                            </div>
                            <div className="col-12 xl:col-6">
                                <NetMovementChart overview={overview} />
                            </div>
                            <div className="col-12 xl:col-6">
                                <DebtReductionProgress overview={overview} />
                            </div>
                        </div>
                    </>
                )
            )}
        </>
    );
};

export default MonthlyAnalysisPage;
