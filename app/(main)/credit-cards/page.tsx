'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import CrudPage, { CrudColumn, CrudForm } from '@/app/components/crud/CrudPage';
import PaymentDialog from '@/app/components/credit-card/PaymentDialog';
import StatementDialog from '@/app/components/credit-card/StatementDialog';
import { useCreditCards } from '@/app/components/credit-card/CreditCardFilterBar';
import { formatDate, formatPeso, formatSignedPeso, movementClass, parseApiDate, toApiDate, today } from '@/app/components/credit-card/format';
import { CreditCard, creditCardService } from '@/app/services/credit-card.service';

const MAX_AMOUNT = 999_999_999_999.99;

// Mirrors CreditCardFieldsValidator.
const schema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    nickname: z.string().max(100, 'Nickname must be at most 100 characters'),
    creditLimit: z.number().gt(0, 'Credit limit must be greater than 0').max(MAX_AMOUNT, 'Credit limit is too large').nullable(),
    initialBalance: z.number({ invalid_type_error: 'Initial balance is required' }).min(-MAX_AMOUNT).max(MAX_AMOUNT, 'Initial balance is too large'),
    initialBalanceDate: z.date({ invalid_type_error: 'Initial balance date is required', required_error: 'Initial balance date is required' }).refine((date) => date <= today(), 'Date cannot be in the future'),
    statementCutoffDay: z.number().int().min(1, 'Day must be 1–31').max(31, 'Day must be 1–31').nullable(),
    paymentDueDay: z.number().int().min(1, 'Day must be 1–31').max(31, 'Day must be 1–31').nullable(),
    notes: z.string().max(1000, 'Notes must be at most 1000 characters')
});
type CardForm = z.infer<typeof schema>;

const form: CrudForm<CreditCard, CardForm> = {
    schema,
    fields: [
        { name: 'name', label: 'Credit card name', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. BPI, BDO, UnionBank', half: true },
        { name: 'nickname', label: 'Nickname', type: 'text', maxLength: 100, placeholder: 'e.g. Gold, Rewards', half: true },
        { name: 'initialBalance', label: 'Initial outstanding balance (₱, from your latest SOA)', type: 'decimal', required: true, half: true },
        { name: 'initialBalanceDate', label: 'Initial balance date (that SOA’s cutoff)', type: 'date', required: true, maxDate: today(), half: true },
        { name: 'creditLimit', label: 'Credit limit (₱)', type: 'decimal', min: 0, half: true },
        { name: 'statementCutoffDay', label: 'Statement cutoff day', type: 'integer', min: 1, max: 31, half: true },
        { name: 'paymentDueDay', label: 'Payment due day', type: 'integer', min: 1, max: 31, half: true },
        { name: 'notes', label: 'Notes', type: 'textarea', maxLength: 1000 }
    ],
    get defaultValues() {
        return { name: '', nickname: '', creditLimit: null, initialBalance: null as unknown as number, initialBalanceDate: today(), statementCutoffDay: null, paymentDueDay: null, notes: '' };
    },
    toFormValues: (card) => ({
        name: card.name,
        nickname: card.nickname ?? '',
        creditLimit: card.creditLimit,
        initialBalance: card.initialBalance,
        initialBalanceDate: parseApiDate(card.initialBalanceDate),
        statementCutoffDay: card.statementCutoffDay,
        paymentDueDay: card.paymentDueDay,
        notes: card.notes ?? ''
    })
};

const toRequest = (values: CardForm) => ({ ...values, initialBalanceDate: toApiDate(values.initialBalanceDate), nickname: values.nickname || null, notes: values.notes || null });

const service = {
    ...creditCardService,
    create: (values: CardForm) => creditCardService.create(toRequest(values)),
    update: (id: string, values: CardForm) => creditCardService.update(id, toRequest(values))
};

const CreditCardsPage = () => {
    const router = useRouter();
    const [quick, setQuick] = useState<{ kind: 'payment' | 'statement'; cardId: string; reload: () => void } | null>(null);
    const { cards, reload: reloadCards } = useCreditCards(true);

    const columns: CrudColumn<CreditCard>[] = [
        {
            field: 'name',
            header: 'Card',
            sortField: 'Name',
            body: (row) => (
                <Link href={`/credit-cards/${row.creditCardId}`} className="block">
                    <div className="font-semibold">{row.name}</div>
                    {row.nickname && <div className="text-sm text-color-secondary">{row.nickname}</div>}
                </Link>
            )
        },
        {
            field: 'currentOutstanding',
            header: 'Current outstanding',
            align: 'right',
            body: (row) => (
                <div>
                    <div className="font-semibold">{formatPeso(row.currentOutstanding)}</div>
                    {row.creditLimit !== null && <div className="text-xs text-color-secondary">{formatPeso(row.availableCredit)} available</div>}
                </div>
            )
        },
        {
            field: 'latestStatementDate',
            header: 'Latest SOA',
            body: (row) =>
                row.latestStatementDate ? (
                    <div>
                        <div>{formatPeso(row.latestStatementBalance)}</div>
                        <div className="text-xs text-color-secondary">{formatDate(row.latestStatementDate)}</div>
                    </div>
                ) : (
                    <Tag value="No statement yet" className="debt-tag-pending" rounded />
                )
        },
        {
            field: 'initialBalanceDate',
            header: 'Initial balance',
            sortField: 'InitialBalanceDate',
            body: (row) => (
                <div>
                    <div>{formatPeso(row.initialBalance)}</div>
                    <div className="text-xs text-color-secondary">{formatDate(row.initialBalanceDate)}</div>
                </div>
            )
        },
        {
            field: 'debtReduction',
            header: 'Progress',
            body: (row) => (
                <div>
                    <div className={movementClass(-row.debtReduction)}>{formatSignedPeso(-row.debtReduction)}</div>
                    <div className="text-xs text-color-secondary">{row.debtReductionPercent === null ? '—' : `${row.debtReductionPercent >= 0 ? `${row.debtReductionPercent}% reduced` : `${-row.debtReductionPercent}% higher`}`}</div>
                </div>
            )
        },
        { field: 'creditLimit', header: 'Credit limit', body: (row) => formatPeso(row.creditLimit) },
        { field: 'statementCutoffDay', header: 'Cutoff / due day', body: (row) => `${row.statementCutoffDay ?? '—'} / ${row.paymentDueDay ?? '—'}` },
        { field: 'statementCount', header: 'Statements / payments', body: (row) => `${row.statementCount} / ${row.paymentCount}` }
    ];

    const rowActions = (row: CreditCard, reload: () => void) => (
        <>
            <Button icon="pi pi-arrow-right" rounded text aria-label={`Open ${row.displayName}`} tooltip="Open: statements and payments" tooltipOptions={{ position: 'top' }} onClick={() => router.push(`/credit-cards/${row.creditCardId}`)} />
            <Button
                icon="pi pi-wallet"
                rounded
                text
                severity="success"
                aria-label="Record payment"
                tooltip="Record payment"
                tooltipOptions={{ position: 'top' }}
                onClick={() => setQuick({ kind: 'payment', cardId: row.creditCardId, reload })}
            />
            <Button
                icon="pi pi-file-plus"
                rounded
                text
                severity="info"
                aria-label="Record new SOA"
                tooltip="Record new SOA"
                tooltipOptions={{ position: 'top' }}
                onClick={() => setQuick({ kind: 'statement', cardId: row.creditCardId, reload })}
            />
        </>
    );

    const afterQuickSave = () => {
        quick?.reload();
        reloadCards();
    };

    return (
        <>
            <CrudPage
                title="My Credit Cards"
                description="Open a card to see and record its statements and payments. Enter the balance from your latest SOA as the initial balance; everything after it is calculated."
                icon="pi pi-credit-card"
                entityName="Credit card"
                service={service}
                idField="creditCardId"
                nameField="displayName"
                columns={columns}
                detailColumns={[{ field: 'notes', header: 'Notes' }]}
                form={form}
                searchable
                defaultSort={{ field: 'Name', order: 1 }}
                rowActions={rowActions}
                onChanged={reloadCards}
            />
            <PaymentDialog visible={quick?.kind === 'payment'} cards={cards} creditCardId={quick?.cardId} onHide={() => setQuick(null)} onSaved={afterQuickSave} />
            <StatementDialog visible={quick?.kind === 'statement'} cards={cards} creditCardId={quick?.cardId} onHide={() => setQuick(null)} onSaved={afterQuickSave} />
        </>
    );
};

export default CreditCardsPage;
