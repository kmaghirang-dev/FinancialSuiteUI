'use client';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import PageHeader from '@/app/components/PageHeader';
import { cardOptions, useCreditCards } from '@/app/components/credit-card/CreditCardFilterBar';
import DebtStatusTag from '@/app/components/credit-card/DebtStatusTag';
import PaymentDialog from '@/app/components/credit-card/PaymentDialog';
import StatementDialog from '@/app/components/credit-card/StatementDialog';
import StatementHistoryTable, { historyRows, HistoryRow } from '@/app/components/credit-card/StatementHistoryTable';
import { formatDate, formatPeso, formatSignedPeso, movementClass } from '@/app/components/credit-card/format';
import { CreditCardLedger, CreditCardPayment, creditCardPaymentService, creditCardService, creditCardStatementService } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';

const Stat = ({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) => (
    <div className="col-12 sm:col-6 xl:col-3">
        <div className="card h-full mb-0">
            <div className="text-sm text-color-secondary mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
            {hint && <div className="text-sm text-color-secondary mt-1">{hint}</div>}
        </div>
    </div>
);

// Where a payment lands: a recorded statement, the open period, or (on or before the baseline) nowhere.
const countsToward = (payment: CreditCardPayment) => {
    if (payment.isBeforeInitialBalance) return <Tag value="Already in initial balance" icon="pi pi-flag" className="debt-tag-baseline" rounded />;
    if (payment.statementPeriodEndDate) return `Statement with cutoff ${formatDate(payment.statementPeriodEndDate)}`;
    return <DebtStatusTag status="Pending" />;
};

type Dialog = { kind: 'payment'; paymentId: string | null } | { kind: 'statement'; statementId: string | null };
type Deleting = { kind: 'payment'; payment: CreditCardPayment } | { kind: 'statement'; row: HistoryRow };

// One card: its summary, statement history and payments, with everything recorded and edited from here.
const CreditCardPage = () => {
    const id = useParams().id as string;
    const router = useRouter();
    const { showSuccess, showError } = useToast();
    const { cards, reload: reloadCards } = useCreditCards(true);
    const [ledger, setLedger] = useState<CreditCardLedger | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [payments, setPayments] = useState<CreditCardPayment[]>([]);
    const [paymentTotal, setPaymentTotal] = useState(0);
    const [paging, setPaging] = useState({ first: 0, rows: 10 });
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [deleting, setDeleting] = useState<Deleting | null>(null);
    const [busy, setBusy] = useState(false);

    const loadLedger = useCallback(() => {
        setLoading(true);
        creditCardService
            .getOverview({ creditCardId: id })
            .then((overview) => setLedger(overview.cards.find((c) => c.creditCardId === id) ?? null))
            .catch(showError)
            .finally(() => setLoading(false));
    }, [id, showError]);

    const loadPayments = useCallback(() => {
        setPaymentsLoading(true);
        creditCardPaymentService
            .getPaginated({ pageNumber: paging.first / paging.rows + 1, pageSize: paging.rows, sortBy: 'PaymentDate', sortDirection: 'Descending' }, { creditCardId: id })
            .then((result) => {
                setPayments(result.items);
                setPaymentTotal(result.totalCount);
            })
            .catch(showError)
            .finally(() => setPaymentsLoading(false));
    }, [id, paging, showError]);

    useEffect(loadLedger, [loadLedger]);
    useEffect(loadPayments, [loadPayments]);

    const reloadAll = () => {
        loadLedger();
        loadPayments();
        reloadCards();
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setBusy(true);
        try {
            if (deleting.kind === 'payment') {
                await creditCardPaymentService.delete(deleting.payment.creditCardPaymentId);
                showSuccess('Payment deleted. Its statement period was recalculated.');
            } else {
                await creditCardStatementService.delete(deleting.row.statementId!);
                showSuccess('Statement deleted. The following period was recalculated.');
            }
            setDeleting(null);
            reloadAll();
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }
    };

    // Deleting a card only sets IsActive = false, so the existing toggle brings it back.
    const restore = async () => {
        if (!ledger) return;
        setBusy(true);
        try {
            await creditCardService.setActive(id, true);
            showSuccess(`${ledger.displayName} restored.`);
            reloadAll();
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }
    };

    if (loading && !ledger)
        return (
            <div className="flex justify-content-center p-5">
                <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
            </div>
        );

    if (!ledger)
        return (
            <div className="card text-color-secondary">
                This credit card was not found. Go back to <Link href="/credit-cards">My Credit Cards</Link>.
            </div>
        );

    const statementActions = (row: HistoryRow) => (
        <div className="flex gap-1 justify-content-end">
            <Button icon="pi pi-pencil" rounded text aria-label="Edit statement" tooltip="Edit (later periods are recalculated)" tooltipOptions={{ position: 'top' }} onClick={() => setDialog({ kind: 'statement', statementId: row.statementId! })} />
            <Button icon="pi pi-trash" rounded text severity="danger" aria-label="Delete statement" tooltip="Delete" tooltipOptions={{ position: 'top' }} onClick={() => setDeleting({ kind: 'statement', row })} />
        </div>
    );

    const paymentActions = (payment: CreditCardPayment) => (
        <div className="flex gap-1 justify-content-end">
            <Button label="Edit" icon="pi pi-pencil" size="small" outlined aria-label="Edit payment" onClick={(e) => { e.stopPropagation(); setDialog({ kind: 'payment', paymentId: payment.creditCardPaymentId }); }} />
            <Button label="Delete" icon="pi pi-trash" size="small" outlined severity="danger" aria-label="Delete payment" onClick={(e) => { e.stopPropagation(); setDeleting({ kind: 'payment', payment }); }} />
        </div>
    );

    const reduction = ledger.debtReduction;

    return (
        <>
            <PageHeader
                title={ledger.displayName}
                description={ledger.isActive ? 'Statements and payments for this card. Edits to past entries recalculate every later period.' : 'This card was deleted. Restore it to list it again and record new entries.'}
                icon="pi pi-credit-card"
                actions={
                    ledger.isActive ? (
                        <>
                            <Button label="Record payment" icon="pi pi-wallet" severity="success" onClick={() => setDialog({ kind: 'payment', paymentId: null })} />
                            <Button label="Record new SOA" icon="pi pi-file-plus" onClick={() => setDialog({ kind: 'statement', statementId: null })} />
                        </>
                    ) : (
                        <Button label="Restore card" icon="pi pi-replay" loading={busy} onClick={restore} />
                    )
                }
            >
                <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <Link href="/credit-cards" className="text-sm">
                        <i className="pi pi-arrow-left text-xs mr-2" />
                        All credit cards
                    </Link>
                    <Dropdown value={id} options={cardOptions(cards)} onChange={(e) => e.value && e.value !== id && router.push(`/credit-cards/${e.value}`)} placeholder="Switch card" aria-label="Switch card" className="w-full sm:w-16rem" />
                </div>
            </PageHeader>

            <div className="grid">
                <Stat
                    label="Current outstanding"
                    value={formatPeso(ledger.currentOutstanding)}
                    hint={ledger.creditLimit !== null ? `${formatPeso(ledger.availableCredit)} available of ${formatPeso(ledger.creditLimit)}` : 'Latest SOA balance minus payments since'}
                />
                <Stat
                    label="Latest SOA balance"
                    value={formatPeso(ledger.latestStatementBalance)}
                    hint={ledger.latestStatementDate ? `Statement of ${formatDate(ledger.latestStatementDate)}` : `Initial balance as of ${formatDate(ledger.initialBalanceDate)}`}
                />
                <Stat
                    label="Change since initial balance"
                    value={<span className={movementClass(-reduction)}>{formatSignedPeso(-reduction)}</span>}
                    hint={
                        ledger.debtReductionPercent === null
                            ? `From ${formatPeso(ledger.initialBalance)}`
                            : ledger.debtReductionPercent >= 0
                            ? `${ledger.debtReductionPercent}% paid down from ${formatPeso(ledger.initialBalance)}`
                            : `${-ledger.debtReductionPercent}% higher than ${formatPeso(ledger.initialBalance)}`
                    }
                />
                <Stat
                    label="Payments recorded"
                    value={paymentTotal}
                    hint={ledger.openPeriod ? `${ledger.openPeriod.paymentCount} payment${ledger.openPeriod.paymentCount === 1 ? '' : 's'} waiting for the next SOA` : undefined}
                />
            </div>

            <div className="card mt-3">
                <TabView activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
                    <TabPanel header="Statement history" leftIcon="pi pi-file mr-2">
                        <StatementHistoryTable rows={historyRows(ledger)} actions={statementActions} />
                        <p className="text-xs text-color-secondary mt-3 mb-0">
                            Estimated net card activity = closing balance − previous closing balance + payments between the two statements. It combines purchases, interest, fees, refunds and credits, so it is not the exact total of purchases.
                        </p>
                    </TabPanel>
                    <TabPanel header={`Payments (${paymentTotal})`} leftIcon="pi pi-wallet mr-2">
                        <DataTable
                            value={payments}
                            dataKey="creditCardPaymentId"
                            lazy
                            paginator
                            first={paging.first}
                            rows={paging.rows}
                            totalRecords={paymentTotal}
                            rowsPerPageOptions={[10, 15, 30]}
                            onPage={(e: DataTableStateEvent) => setPaging({ first: e.first, rows: e.rows })}
                            loading={paymentsLoading}
                            size="small"
                            stripedRows
                            scrollable
                            emptyMessage="No payments recorded yet."
                            rowClassName={() => 'cursor-pointer'}
                            onRowClick={(e) => setDialog({ kind: 'payment', paymentId: (e.data as CreditCardPayment).creditCardPaymentId })}
                        >
                            <Column header="Payment date" body={(row: CreditCardPayment) => formatDate(row.paymentDate)} />
                            <Column header="Amount" align="right" alignHeader="right" body={(row: CreditCardPayment) => <span className="font-semibold debt-down">{formatPeso(row.amount)}</span>} />
                            <Column header="Counts toward" body={countsToward} />
                            <Column field="paymentReference" header="Reference" />
                            <Column field="notes" header="Notes" style={{ maxWidth: '16rem' }} />
                            <Column header="Actions" alignHeader="right" body={paymentActions} style={{ width: '1%' }} className="white-space-nowrap" />
                        </DataTable>
                        <p className="text-xs text-color-secondary mt-3 mb-0">
                            A payment counts toward the first statement whose cutoff is on or after its date; payments after the latest SOA wait for the next one. Click a payment to edit it. Payments on or before the initial balance date are already part of that balance.
                        </p>
                    </TabPanel>
                </TabView>
            </div>

            <PaymentDialog visible={dialog?.kind === 'payment'} cards={cards} creditCardId={id} paymentId={dialog?.kind === 'payment' ? dialog.paymentId : null} onHide={() => setDialog(null)} onSaved={reloadAll} />
            <StatementDialog visible={dialog?.kind === 'statement'} cards={cards} creditCardId={id} statementId={dialog?.kind === 'statement' ? dialog.statementId : null} onHide={() => setDialog(null)} onSaved={reloadAll} />

            <ConfirmDialog
                visible={!!deleting}
                header={deleting?.kind === 'payment' ? 'Delete payment' : 'Delete statement'}
                message={
                    deleting?.kind === 'payment' ? (
                        <>
                            Delete the <b>{formatPeso(deleting.payment.amount)}</b> payment of {formatDate(deleting.payment.paymentDate)}? Its statement period is recalculated. This cannot be undone.
                        </>
                    ) : (
                        <>
                            Delete the statement of <b>{deleting?.kind === 'statement' && deleting.row.statementDate ? formatDate(deleting.row.statementDate) : ''}</b>? Its payments move to the following period and that period is recalculated. This
                            cannot be undone.
                        </>
                    )
                }
                loading={busy}
                onConfirm={confirmDelete}
                onHide={() => setDeleting(null)}
            />
        </>
    );
};

export default CreditCardPage;
