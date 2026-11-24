'use client';
import { ReactNode } from 'react';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import { CreditCardLedger, DebtStatus } from '@/app/services/credit-card.service';
import DebtStatusTag from './DebtStatusTag';
import { formatDate, formatPeriod, formatPeso, formatSignedPeso, movementClass } from './format';

export interface HistoryRow {
    key: string;
    kind: 'baseline' | 'completed' | 'open';
    cardName: string;
    // "yyyy-MM-dd" for ordering rows across cards: the initial balance date, the cutoff, or the open period's start.
    sortDate: string;
    statementId?: string;
    period: ReactNode;
    statementDate?: string;
    openingBalance: number | null;
    totalPayments: number | null;
    paymentCount: number;
    estimatedNetActivity: number | null;
    closingBalance: number | null;
    netDebtMovement: number | null;
    debtStatus?: DebtStatus;
    isLatest?: boolean;
    currentOutstanding?: number;
    notes?: string;
}

// Rows in date order: the initial balance (baseline), each completed statement period, then the open period.
// includeBaseline is off when the rows are limited to a date range.
export const historyRows = (ledger: CreditCardLedger, includeBaseline = true): HistoryRow[] => {
    const rows: HistoryRow[] = [];
    if (includeBaseline) {
        rows.push({
            key: `${ledger.creditCardId}-baseline`,
            kind: 'baseline',
            cardName: ledger.displayName,
            sortDate: ledger.initialBalanceDate,
            period: (
                <div>
                    <div className="font-medium">Initial balance</div>
                    <div className="text-xs text-color-secondary">As of {formatDate(ledger.initialBalanceDate)}</div>
                </div>
            ),
            openingBalance: null,
            totalPayments: null,
            paymentCount: 0,
            estimatedNetActivity: null,
            closingBalance: ledger.initialBalance,
            netDebtMovement: null
        });
    }
    ledger.periods.forEach((p) =>
        rows.push({
            key: p.statementId,
            kind: 'completed',
            cardName: ledger.displayName,
            sortDate: p.periodEndDate,
            statementId: p.statementId,
            period: (
                <div>
                    <div className="font-medium">{formatPeriod(p.periodStartDate, p.periodEndDate)}</div>
                    {p.isLatest && <Tag value="Latest SOA · current baseline" className="debt-tag-baseline mt-1" />}
                </div>
            ),
            statementDate: p.statementDate,
            openingBalance: p.openingBalance,
            totalPayments: p.totalPayments,
            paymentCount: p.paymentCount,
            estimatedNetActivity: p.estimatedNetActivity,
            closingBalance: p.closingBalance,
            netDebtMovement: p.netDebtMovement,
            debtStatus: p.debtStatus,
            isLatest: p.isLatest,
            notes: p.notes
        })
    );
    if (ledger.openPeriod) {
        const open = ledger.openPeriod;
        rows.push({
            key: `${ledger.creditCardId}-open`,
            kind: 'open',
            cardName: ledger.displayName,
            sortDate: open.sinceDate,
            period: (
                <div>
                    <div className="font-medium">Current period</div>
                    <div className="text-xs text-color-secondary">After {formatDate(open.sinceDate)}, until the next SOA</div>
                </div>
            ),
            openingBalance: open.openingBalance,
            totalPayments: open.paymentsSoFar,
            paymentCount: open.paymentCount,
            estimatedNetActivity: null,
            closingBalance: null,
            netDebtMovement: null,
            currentOutstanding: open.currentOutstanding
        });
    }
    return rows;
};

const money = (value: number | null) => (value === null ? <span className="text-color-secondary">—</span> : formatPeso(value));

interface Props {
    rows: HistoryRow[];
    showCard?: boolean;
    // Edit/delete controls for completed statements.
    actions?: (row: HistoryRow) => ReactNode;
    emptyMessage?: string;
    footer?: ReactNode;
}

const StatementHistoryTable = ({ rows, showCard, actions, emptyMessage = 'No statements yet.', footer }: Props) => (
    <DataTable
        value={rows}
        dataKey="key"
        size="small"
        stripedRows
        emptyMessage={emptyMessage}
        rowClassName={(row: HistoryRow) => ({ 'statement-row-baseline': row.kind === 'baseline', 'statement-row-open': row.kind === 'open' })}
        footerColumnGroup={footer as any}
        scrollable
    >
        {showCard && <Column field="cardName" header="Card" style={{ minWidth: '8rem' }} />}
        <Column header="Statement period" body={(row: HistoryRow) => row.period} style={{ minWidth: '12rem' }} />
        <Column header="Opening balance" align="right" alignHeader="right" body={(row: HistoryRow) => money(row.openingBalance)} />
        <Column
            header="Payments"
            align="right"
            alignHeader="right"
            body={(row: HistoryRow) =>
                row.totalPayments === null ? (
                    money(null)
                ) : (
                    <div>
                        <div className="debt-down">{formatPeso(row.totalPayments)}</div>
                        <div className="text-xs text-color-secondary">
                            {row.paymentCount} payment{row.paymentCount === 1 ? '' : 's'}
                            {row.kind === 'open' ? ' so far' : ''}
                        </div>
                    </div>
                )
            }
        />
        <Column header="Est. net card activity" align="right" alignHeader="right" body={(row: HistoryRow) => (row.kind === 'open' ? <span className="text-color-secondary">Pending next statement</span> : money(row.estimatedNetActivity))} />
        <Column
            header="Closing balance"
            align="right"
            alignHeader="right"
            body={(row: HistoryRow) =>
                row.kind === 'open' ? (
                    <div>
                        <div className="text-color-secondary">Awaiting SOA</div>
                        <div className="text-xs text-color-secondary">≈ {formatPeso(row.currentOutstanding!)} owed now</div>
                    </div>
                ) : (
                    <span className="font-semibold">{formatPeso(row.closingBalance)}</span>
                )
            }
        />
        <Column
            header="Net debt movement"
            align="right"
            alignHeader="right"
            body={(row: HistoryRow) => (row.netDebtMovement === null ? money(null) : <span className={`font-semibold ${movementClass(row.netDebtMovement)}`}>{formatSignedPeso(row.netDebtMovement)}</span>)}
        />
        <Column header="Debt status" body={(row: HistoryRow) => <DebtStatusTag status={row.kind === 'baseline' ? 'Baseline' : row.kind === 'open' ? 'Pending' : row.debtStatus!} />} />
        {actions && <Column body={(row: HistoryRow) => (row.kind === 'completed' ? actions(row) : null)} style={{ width: '1%' }} className="white-space-nowrap" />}
    </DataTable>
);

export default StatementHistoryTable;
