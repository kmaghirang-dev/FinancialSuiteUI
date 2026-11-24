'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import PageHeader from '@/app/components/PageHeader';
import CreditCardFilterBar, { initialFilter, toDateRange, useCreditCards } from '@/app/components/credit-card/CreditCardFilterBar';
import { BalanceTrendChart, DebtReductionProgress, NetActivityChart, PaymentHistoryChart, PaymentVsActivityChart } from '@/app/components/credit-card/CreditCardCharts';
import DebtStatusTag from '@/app/components/credit-card/DebtStatusTag';
import DebtSummaryCards from '@/app/components/credit-card/DebtSummaryCards';
import PaymentDialog from '@/app/components/credit-card/PaymentDialog';
import StatementDialog from '@/app/components/credit-card/StatementDialog';
import { formatDate, formatPeso, formatSignedPeso, movementClass } from '@/app/components/credit-card/format';
import { CreditCardOverview, CreditCardPayment, creditCardPaymentService, creditCardService } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';

const CreditCardOverviewPage = () => {
    const { showError } = useToast();
    const [filter, setFilter] = useState(initialFilter);
    const { cards, reload: reloadCards } = useCreditCards(true);
    const [overview, setOverview] = useState<CreditCardOverview | null>(null);
    const [payments, setPayments] = useState<CreditCardPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState<{ kind: 'payment' | 'statement'; cardId?: string } | null>(null);
    const range = toDateRange(filter);

    const load = useCallback(() => {
        setLoading(true);
        const creditCardId = filter.creditCardId || undefined;
        Promise.all([creditCardService.getOverview({ creditCardId, from: range.from, to: range.to }), creditCardPaymentService.getPaginated({ pageNumber: 1, pageSize: 5, sortBy: 'PaymentDate', sortDirection: 'Descending' }, { creditCardId })])
            .then(([data, recent]) => {
                setOverview(data);
                setPayments(recent.items);
            })
            .catch(showError)
            .finally(() => setLoading(false));
    }, [filter.creditCardId, range.from, range.to, showError]);

    useEffect(load, [load]);

    const reloadAll = () => {
        load();
        reloadCards();
    };

    const hasActiveCards = cards.some((c) => c.isActive);
    // "View all" opens the filtered card's page, which holds its statements and payments.
    const cardsLink = filter.creditCardId ? `/credit-cards/${filter.creditCardId}` : '/credit-cards';
    // Latest completed periods across the shown cards, newest cutoff first.
    const recentStatements = (overview?.cards ?? [])
        .flatMap((card) => card.periods.map((period) => ({ card, period })))
        .sort((a, b) => b.period.periodEndDate.localeCompare(a.period.periodEndDate))
        .slice(0, 5);

    return (
        <>
            <PageHeader
                title="Credit Card Overview"
                description="How much you owe, what you paid, and whether your credit card debt is going down."
                icon="pi pi-credit-card"
                actions={
                    <>
                        <Button label="Record payment" icon="pi pi-wallet" severity="success" onClick={() => setDialog({ kind: 'payment', cardId: filter.creditCardId || undefined })} disabled={!hasActiveCards} />
                        <Button label="Record new SOA" icon="pi pi-file-plus" onClick={() => setDialog({ kind: 'statement', cardId: filter.creditCardId || undefined })} disabled={!hasActiveCards} />
                    </>
                }
            />

            <div className="card">
                <div className="flex flex-column md:flex-row md:align-items-end md:justify-content-between gap-3">
                    <CreditCardFilterBar value={filter} onChange={setFilter} cards={cards} />
                    <Button icon="pi pi-refresh" severity="info" tooltip="Refresh" tooltipOptions={{ position: 'top' }} onClick={reloadAll} aria-label="Refresh" />
                </div>
            </div>

            {loading && !overview ? (
                <div className="flex justify-content-center p-5">
                    <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
                </div>
            ) : !overview || overview.cards.length === 0 ? (
                <div className="card text-color-secondary">
                    No active credit cards yet. Start in <Link href="/credit-cards">My Credit Cards</Link>: add a card with the balance from your latest statement, then record payments and each new SOA.
                </div>
            ) : (
                <>
                    <DebtSummaryCards summary={overview.summary} rangeLabel={range.label} />

                    <div className="grid mt-2">
                        <div className="col-12 xl:col-8">
                            <BalanceTrendChart overview={overview} />
                        </div>
                        <div className="col-12 xl:col-4">
                            <DebtReductionProgress overview={overview} />
                        </div>
                        <div className="col-12 xl:col-6">
                            <NetActivityChart overview={overview} />
                        </div>
                        <div className="col-12 xl:col-6">
                            <PaymentHistoryChart overview={overview} />
                        </div>
                        <div className="col-12">
                            <PaymentVsActivityChart overview={overview} />
                        </div>
                    </div>

                    <div className="grid mt-2">
                        <div className="col-12 lg:col-6">
                            <div className="card h-full">
                                <div className="flex justify-content-between align-items-center mb-3">
                                    <h5 className="m-0">Recent payments</h5>
                                    <Link href={cardsLink}>View all</Link>
                                </div>
                                {payments.length === 0 ? (
                                    <p className="text-color-secondary m-0">No payments recorded yet.</p>
                                ) : (
                                    <ul className="list-none p-0 m-0">
                                        {payments.map((payment) => (
                                            <li key={payment.creditCardPaymentId} className="flex justify-content-between align-items-center gap-2 py-2 border-bottom-1 surface-border">
                                                <div>
                                                    <Link href={`/credit-cards/${payment.creditCardId}`} className="font-medium block">
                                                        {payment.creditCardName}
                                                    </Link>
                                                    <div className="text-sm text-color-secondary">{formatDate(payment.paymentDate)}</div>
                                                </div>
                                                <span className="font-semibold debt-down">{formatPeso(payment.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="col-12 lg:col-6">
                            <div className="card h-full">
                                <div className="flex justify-content-between align-items-center mb-3">
                                    <h5 className="m-0">Recent statements</h5>
                                    <Link href={cardsLink}>View all</Link>
                                </div>
                                {recentStatements.length === 0 ? (
                                    <p className="text-color-secondary m-0">No statements in this period. Record the next SOA when it arrives.</p>
                                ) : (
                                    <ul className="list-none p-0 m-0">
                                        {recentStatements.map(({ card, period }) => (
                                            <li key={period.statementId} className="flex justify-content-between align-items-center gap-2 py-2 border-bottom-1 surface-border">
                                                <div>
                                                    <Link href={`/credit-cards/${card.creditCardId}`} className="font-medium block">
                                                        {card.displayName}
                                                    </Link>
                                                    <div className="text-sm text-color-secondary">
                                                        Cutoff {formatDate(period.periodEndDate)} · balance {formatPeso(period.closingBalance)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-column align-items-end gap-1">
                                                    <span className={`font-semibold white-space-nowrap ${movementClass(period.netDebtMovement)}`}>{formatSignedPeso(period.netDebtMovement)}</span>
                                                    <DebtStatusTag status={period.debtStatus} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <PaymentDialog visible={dialog?.kind === 'payment'} cards={cards} creditCardId={dialog?.cardId} onHide={() => setDialog(null)} onSaved={reloadAll} />
            <StatementDialog visible={dialog?.kind === 'statement'} cards={cards} creditCardId={dialog?.cardId} onHide={() => setDialog(null)} onSaved={reloadAll} />
        </>
    );
};

export default CreditCardOverviewPage;
