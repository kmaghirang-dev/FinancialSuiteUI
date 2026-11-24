'use client';
import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { CreditCard, creditCardStatementService, StatementPreview } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';
import { cardOptions } from './CreditCardFilterBar';
import DebtStatusTag from './DebtStatusTag';
import { addDays, formatDate, formatPeso, formatSignedPeso, movementClass, parseApiDate, toApiDate, today } from './format';

interface Props {
    visible: boolean;
    cards: CreditCard[];
    // Set to edit a recorded statement.
    statementId?: string | null;
    creditCardId?: string;
    onHide: () => void;
    onSaved: () => void;
}

interface FormState {
    creditCardId: string;
    statementDate: Date | null;
    periodStartDate: Date | null;
    periodEndDate: Date | null;
    closingBalance: number | null;
    notes: string;
}

const EMPTY: FormState = { creditCardId: '', statementDate: null, periodStartDate: null, periodEndDate: null, closingBalance: null, notes: '' };

// The next period starts the day after the latest cutoff and ends on the card's cutoff day (or a month later).
const suggestPeriod = (card: CreditCard) => {
    const start = addDays(parseApiDate(card.latestCutoffDate), 1);
    let end: Date;
    if (card.statementCutoffDay) {
        const onCutoff = (year: number, month: number) => new Date(year, month, Math.min(card.statementCutoffDay!, new Date(year, month + 1, 0).getDate()));
        end = onCutoff(start.getFullYear(), start.getMonth());
        if (end < addDays(start, 14)) end = onCutoff(start.getFullYear(), start.getMonth() + 1);
    } else {
        end = addDays(new Date(start.getFullYear(), start.getMonth() + 1, start.getDate()), -1);
    }
    return { periodStartDate: start, periodEndDate: end, statementDate: end <= today() ? end : today() };
};

const FORM_ID = 'statement-form';

const StatementDialog = ({ visible, cards, statementId, creditCardId, onHide, onSaved }: Props) => {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<StatementPreview | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const editing = !!statementId;

    const selectCard = (id: string, base: FormState = EMPTY) => {
        const card = cards.find((c) => c.creditCardId === id);
        setForm({ ...base, creditCardId: id, ...(card ? suggestPeriod(card) : {}) });
    };

    // Reset on open: load the statement to edit, or start a new one for the preselected (or only) card.
    useEffect(() => {
        if (!visible) return;
        setPreview(null);
        setSubmitted(false);
        if (statementId) {
            setLoading(true);
            creditCardStatementService
                .getById(statementId)
                .then((s) =>
                    setForm({
                        creditCardId: s.creditCardId,
                        statementDate: parseApiDate(s.statementDate),
                        periodStartDate: parseApiDate(s.periodStartDate),
                        periodEndDate: parseApiDate(s.periodEndDate),
                        closingBalance: s.closingBalance,
                        notes: s.notes ?? ''
                    })
                )
                .catch((error) => {
                    showError(error);
                    onHide();
                })
                .finally(() => setLoading(false));
        } else {
            const active = cards.filter((c) => c.isActive);
            const preselected = creditCardId ?? (active.length === 1 ? active[0].creditCardId : '');
            if (preselected) selectCard(preselected);
            else setForm(EMPTY);
        }
    }, [visible, statementId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Live preview of the calculation, debounced while typing.
    useEffect(() => {
        if (!visible || loading || !form.creditCardId || !form.periodEndDate) {
            setPreview(null);
            return;
        }
        let cancelled = false;
        setPreviewing(true);
        const timeout = setTimeout(() => {
            creditCardStatementService
                .getPreview({
                    creditCardId: form.creditCardId,
                    periodStartDate: form.periodStartDate ? toApiDate(form.periodStartDate) : undefined,
                    periodEndDate: toApiDate(form.periodEndDate!),
                    closingBalance: form.closingBalance,
                    creditCardStatementId: statementId ?? undefined
                })
                .then((result) => !cancelled && setPreview(result))
                .catch(() => !cancelled && setPreview(null))
                .finally(() => !cancelled && setPreviewing(false));
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [visible, loading, form.creditCardId, form.periodStartDate, form.periodEndDate, form.closingBalance, statementId]);

    const errors = {
        creditCardId: !form.creditCardId ? 'Credit card is required' : null,
        periodStartDate: !form.periodStartDate ? 'Period start is required' : null,
        periodEndDate: !form.periodEndDate ? 'Period end is required' : form.periodStartDate && form.periodEndDate < form.periodStartDate ? 'Period end must be on or after the start' : null,
        statementDate: !form.statementDate
            ? 'Statement date is required'
            : form.statementDate > today()
            ? 'Statement date cannot be in the future'
            : form.periodEndDate && form.statementDate < form.periodEndDate
            ? 'Statement date must be on or after the period end'
            : null,
        closingBalance: form.closingBalance === null ? 'Closing balance is required' : null
    };
    const hasErrors = Object.values(errors).some(Boolean);
    const errorFor = (field: keyof typeof errors) => (submitted ? errors[field] : null);

    const save = async () => {
        setSubmitted(true);
        if (hasErrors || preview?.problem) return;
        setSaving(true);
        const request = {
            creditCardId: form.creditCardId,
            statementDate: toApiDate(form.statementDate!),
            periodStartDate: toApiDate(form.periodStartDate!),
            periodEndDate: toApiDate(form.periodEndDate!),
            closingBalance: form.closingBalance!,
            notes: form.notes || null
        };
        try {
            if (statementId) await creditCardStatementService.update(statementId, request);
            else await creditCardStatementService.create(request);
            showSuccess(statementId ? 'Statement updated. Affected periods were recalculated.' : 'Statement recorded.');
            onSaved();
            onHide();
        } catch (error) {
            showError(error);
        } finally {
            setSaving(false);
        }
    };

    const selectableCards = cards.filter((c) => c.isActive || c.creditCardId === form.creditCardId);
    const set = (patch: Partial<FormState>) => setForm((state) => ({ ...state, ...patch }));

    const footer = (
        <div className="flex justify-content-between">
            <Button label="Cancel" icon="pi pi-times" severity="danger" onClick={onHide} disabled={saving} />
            <Button label="Save statement" icon="pi pi-check" type="submit" form={FORM_ID} loading={saving} disabled={loading || !!preview?.problem} />
        </div>
    );

    const previousLabel = preview ? (preview.opensFromInitialBalance ? `Initial balance (${formatDate(preview.previousCutoffDate)})` : `Previous statement balance (cutoff ${formatDate(preview.previousCutoffDate)})`) : 'Previous statement balance';

    return (
        <Dialog visible={visible} header={editing ? 'Edit statement (SOA)' : 'Record new statement (SOA)'} modal footer={footer} onHide={onHide} className="p-fluid" style={{ width: '44rem' }} breakpoints={{ '700px': '95vw' }}>
            {loading ? (
                <div className="flex justify-content-center p-4">
                    <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
                </div>
            ) : (
                <form
                    id={FORM_ID}
                    className="formgrid grid pt-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <div className="field col-12">
                        <label htmlFor="statement-card">
                            Credit card<span className="text-red-400 ml-1">*</span>
                        </label>
                        <Dropdown
                            inputId="statement-card"
                            value={form.creditCardId}
                            options={cardOptions(selectableCards)}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select a card"
                            disabled={editing}
                            onChange={(e) => selectCard(e.value, { ...EMPTY, closingBalance: form.closingBalance, notes: form.notes })}
                            className={errorFor('creditCardId') ? 'p-invalid' : undefined}
                        />
                        {errorFor('creditCardId') && <small className="p-error">{errorFor('creditCardId')}</small>}
                        {editing && <small className="text-color-secondary">A statement stays on its card. Delete it and record it again to move it.</small>}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="statement-period-start">
                            Statement period start<span className="text-red-400 ml-1">*</span>
                        </label>
                        <Calendar
                            inputId="statement-period-start"
                            value={form.periodStartDate}
                            onChange={(e) => set({ periodStartDate: (e.value as Date) ?? null })}
                            dateFormat="M d, yy"
                            showIcon
                            className={errorFor('periodStartDate') ? 'p-invalid' : undefined}
                        />
                        {errorFor('periodStartDate') && <small className="p-error">{errorFor('periodStartDate')}</small>}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="statement-period-end">
                            Statement period end (cutoff)<span className="text-red-400 ml-1">*</span>
                        </label>
                        <Calendar
                            inputId="statement-period-end"
                            value={form.periodEndDate}
                            onChange={(e) => set({ periodEndDate: (e.value as Date) ?? null })}
                            dateFormat="M d, yy"
                            showIcon
                            className={errorFor('periodEndDate') ? 'p-invalid' : undefined}
                        />
                        {errorFor('periodEndDate') && <small className="p-error">{errorFor('periodEndDate')}</small>}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="statement-date">
                            Statement date<span className="text-red-400 ml-1">*</span>
                        </label>
                        <Calendar
                            inputId="statement-date"
                            value={form.statementDate}
                            onChange={(e) => set({ statementDate: (e.value as Date) ?? null })}
                            dateFormat="M d, yy"
                            maxDate={today()}
                            showIcon
                            className={errorFor('statementDate') ? 'p-invalid' : undefined}
                        />
                        {errorFor('statementDate') && <small className="p-error">{errorFor('statementDate')}</small>}
                    </div>
                    <div className="field col-12 md:col-6">
                        <label htmlFor="statement-closing">
                            Closing balance (₱)<span className="text-red-400 ml-1">*</span>
                        </label>
                        <InputNumber
                            inputId="statement-closing"
                            value={form.closingBalance}
                            // onChange fires on every keystroke (onValueChange only on blur), so the preview follows the typing.
                            onChange={(e) => set({ closingBalance: e.value ?? null })}
                            onValueChange={(e) => set({ closingBalance: e.value ?? null })}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            placeholder="Total balance on the SOA"
                            className={errorFor('closingBalance') ? 'p-invalid' : undefined}
                        />
                        {errorFor('closingBalance') && <small className="p-error">{errorFor('closingBalance')}</small>}
                    </div>
                    <div className="field col-12">
                        <label htmlFor="statement-opening">Opening balance</label>
                        <InputNumber inputId="statement-opening" value={preview?.previousBalance ?? null} mode="decimal" minFractionDigits={2} maxFractionDigits={2} disabled placeholder="Filled in from the previous statement" />
                        <small className="text-color-secondary">Always the previous statement&apos;s closing balance (or the card&apos;s initial balance).</small>
                    </div>
                    <div className="field col-12">
                        <label htmlFor="statement-notes">Notes</label>
                        <InputTextarea id="statement-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} autoResize maxLength={1000} />
                    </div>

                    <div className="col-12">
                        <div className="statement-preview" aria-live="polite">
                            <div className="flex align-items-center justify-content-between mb-2">
                                <span className="font-semibold">Calculation preview</span>
                                {previewing && <i className="pi pi-spin pi-spinner text-color-secondary" aria-label="Calculating" />}
                            </div>
                            {!preview ? (
                                <div className="text-color-secondary text-sm">Choose a card and the statement period to see the calculation.</div>
                            ) : (
                                <>
                                    <div className="statement-preview-row">
                                        <span>{previousLabel}</span>
                                        <span>{formatPeso(preview.previousBalance)}</span>
                                    </div>
                                    <div className="statement-preview-row">
                                        <span>
                                            Payments made since ({preview.paymentCount} payment{preview.paymentCount === 1 ? '' : 's'})
                                        </span>
                                        <span className="debt-down">{formatPeso(preview.paymentsSincePrevious)}</span>
                                    </div>
                                    <div className="statement-preview-row">
                                        <span>New statement balance</span>
                                        <span>{formatPeso(preview.newBalance)}</span>
                                    </div>
                                    <div className="statement-preview-row statement-preview-total">
                                        <span>Estimated net card activity</span>
                                        <span>{preview.estimatedNetActivity === null ? '—' : formatPeso(preview.estimatedNetActivity)}</span>
                                    </div>
                                    <div className="statement-preview-row statement-preview-total">
                                        <span>Net debt movement</span>
                                        <span className="flex align-items-center gap-2">
                                            {preview.netDebtMovement === null ? '—' : <span className={movementClass(preview.netDebtMovement)}>{formatSignedPeso(preview.netDebtMovement)}</span>}
                                            {preview.debtStatus && <DebtStatusTag status={preview.debtStatus} />}
                                        </span>
                                    </div>
                                    <div className="text-xs text-color-secondary mt-2">New balance − previous balance + payments. It combines purchases, interest, fees, refunds and credits, so it is an estimate, not exact gross purchases.</div>
                                    {preview.laterStatementCount > 0 && !preview.problem && <Message className="mt-2 w-full justify-content-start" severity="info" text={`${preview.laterStatementCount} later statement(s) will be recalculated.`} />}
                                    {preview.problem && <Message className="mt-2 w-full justify-content-start" severity="warn" text={preview.problem} />}
                                </>
                            )}
                        </div>
                    </div>
                </form>
            )}
        </Dialog>
    );
};

export default StatementDialog;
