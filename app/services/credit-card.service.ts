import { AuditFields } from '../types';
import apiClient from './api-client';
import createService, { PagedQuery } from './http-service';

// Dates from and to the API are "yyyy-MM-dd" unless noted; money is in pesos with up to 2 decimals.

export type DebtStatus = 'Increased' | 'Decreased' | 'No change';

export interface CreditCard extends AuditFields {
    creditCardId: string;
    name: string;
    nickname: string;
    displayName: string;
    creditLimit: number | null;
    initialBalance: number;
    initialBalanceDate: string;
    statementCutoffDay: number | null;
    paymentDueDay: number | null;
    notes: string;
    // Calculated by the API from statements and payments.
    currentOutstanding: number;
    availableCredit: number | null;
    latestStatementBalance: number;
    latestStatementDate: string | null;
    // The latest statement cutoff, or the initial balance date before any statement.
    latestCutoffDate: string;
    statementCount: number;
    paymentCount: number;
    debtReduction: number;
    debtReductionPercent: number | null;
}

export interface CreditCardRequest {
    name: string;
    nickname?: string | null;
    creditLimit?: number | null;
    initialBalance: number;
    initialBalanceDate: string;
    statementCutoffDay?: number | null;
    paymentDueDay?: number | null;
    notes?: string | null;
}

// A completed statement-to-statement period.
export interface StatementPeriod {
    statementId: string;
    statementDate: string;
    periodStartDate: string;
    periodEndDate: string;
    previousCutoffDate: string;
    opensFromInitialBalance: boolean;
    openingBalance: number;
    totalPayments: number;
    paymentCount: number;
    estimatedNetActivity: number;
    closingBalance: number;
    netDebtMovement: number;
    debtStatus: DebtStatus;
    isLatest: boolean;
    notes: string;
}

// The period after the latest statement; its activity is unknown until the next statement.
export interface OpenPeriod {
    sinceDate: string;
    latestStatementId: string | null;
    openingBalance: number;
    paymentsSoFar: number;
    paymentCount: number;
    currentOutstanding: number;
}

export interface CreditCardLedger {
    creditCardId: string;
    name: string;
    nickname: string;
    displayName: string;
    creditLimit: number | null;
    availableCredit: number | null;
    isActive: boolean;
    initialBalance: number;
    initialBalanceDate: string;
    currentOutstanding: number;
    latestStatementBalance: number;
    latestStatementDate: string | null;
    statementCount: number;
    debtReduction: number;
    debtReductionPercent: number | null;
    periods: StatementPeriod[];
    openPeriod: OpenPeriod | null;
}

export interface CreditCardSummary {
    cardCount: number;
    totalOutstanding: number;
    totalPayments: number;
    paymentCount: number;
    estimatedNetActivity: number;
    completedPeriodCount: number;
    netDebtMovement: number;
    debtStatus: DebtStatus;
    initialTotalBalance: number;
    debtReduction: number;
    debtReductionPercent: number | null;
}

export interface CreditCardOverview {
    from: string | null;
    to: string | null;
    summary: CreditCardSummary;
    cards: CreditCardLedger[];
    // Month-end statement balances ("yyyy-MM"), then today's outstanding balance (isCurrent).
    balanceTrend: { month: string; date: string; balance: number; isCurrent: boolean }[];
    // Completed periods grouped by the month of their cutoff.
    periodTotals: { month: string; periodCount: number; totalPayments: number; estimatedNetActivity: number; netDebtMovement: number }[];
}

export interface OverviewFilter {
    creditCardId?: string;
    from?: string;
    to?: string;
}

export interface CreditCardStatement extends Omit<AuditFields, 'isActive'> {
    creditCardStatementId: string;
    creditCardId: string;
    creditCardName: string;
    statementDate: string;
    periodStartDate: string;
    periodEndDate: string;
    openingBalance: number;
    closingBalance: number;
    notes: string;
}

export interface CreditCardStatementRequest {
    creditCardId: string;
    statementDate: string;
    periodStartDate: string;
    periodEndDate: string;
    closingBalance: number;
    notes?: string | null;
}

export interface StatementPreview {
    previousBalance: number;
    previousCutoffDate: string;
    opensFromInitialBalance: boolean;
    previousStatementDate: string | null;
    paymentsSincePrevious: number;
    paymentCount: number;
    newBalance: number | null;
    estimatedNetActivity: number | null;
    netDebtMovement: number | null;
    debtStatus: DebtStatus | null;
    laterStatementCount: number;
    problem: string | null;
}

export interface StatementPreviewQuery {
    creditCardId: string;
    periodStartDate?: string;
    periodEndDate: string;
    closingBalance?: number | null;
    creditCardStatementId?: string;
}

export interface CreditCardPayment extends Omit<AuditFields, 'isActive'> {
    creditCardPaymentId: string;
    creditCardId: string;
    creditCardName: string;
    paymentDate: string;
    amount: number;
    paymentReference: string;
    notes: string;
    // The statement period it counts toward; null = pending the next statement.
    statementId: string | null;
    statementPeriodEndDate: string | null;
    // On or before the card's initial balance date: already in that balance, so not counted.
    isBeforeInitialBalance: boolean;
}

export interface CreditCardPaymentRequest {
    creditCardId: string;
    paymentDate: string;
    amount: number;
    paymentReference?: string | null;
    notes?: string | null;
}

export type PaymentFilters = {
    creditCardId?: string;
    from?: string;
    to?: string;
};

const cards = createService('credit-cards');
const statements = createService('credit-card-statements');
const payments = createService('credit-card-payments');

export const creditCardService = {
    // Active cards by default; isActive '' lists archived ones too.
    getAll: (isActive: 'true' | 'false' | '' = 'true') => apiClient<CreditCard[]>(`credit-cards${isActive ? `?isActive=${isActive}` : ''}`),
    getPaginated: (query: PagedQuery) => cards.getPaginated<CreditCard>(query),
    getById: (id: string) => cards.getById<CreditCard>(id),
    getOverview: (filter: OverviewFilter) => cards.getWithQuery<CreditCardOverview>('overview', filter),
    create: (data: CreditCardRequest) => cards.create(data),
    update: (id: string, data: CreditCardRequest) => cards.update(id, data),
    setActive: (id: string, isActive: boolean) => cards.toggle(id, { isActive }),
    delete: (id: string) => cards.toggle(id, { isActive: false })
};

export const creditCardStatementService = {
    getById: (id: string) => statements.getById<CreditCardStatement>(id),
    getPreview: (query: StatementPreviewQuery) => statements.getWithQuery<StatementPreview>('preview', query),
    create: (data: CreditCardStatementRequest) => statements.create(data),
    update: (id: string, data: CreditCardStatementRequest) => statements.update(id, data),
    delete: (id: string) => statements.delete(id)
};

export const creditCardPaymentService = {
    getPaginated: (query: PagedQuery, filters?: PaymentFilters) => payments.getPaginated<CreditCardPayment>(query, filters),
    getById: (id: string) => payments.getById<CreditCardPayment>(id),
    create: (data: CreditCardPaymentRequest) => payments.create(data),
    update: (id: string, data: CreditCardPaymentRequest) => payments.update(id, data),
    delete: (id: string) => payments.delete(id)
};
