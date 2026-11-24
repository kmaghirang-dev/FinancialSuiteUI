'use client';
import { useEffect, useMemo, useState } from 'react';
import EntityFormDialog from '@/app/components/crud/EntityFormDialog';
import { CreditCard, creditCardPaymentService } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';
import { PaymentForm, paymentDefaults, paymentFields, paymentSchema, paymentToForm, paymentToRequest } from './paymentForm';

interface Props {
    visible: boolean;
    cards: CreditCard[];
    // Preselected card, e.g. when opened from a card's page.
    creditCardId?: string;
    // Set to edit an existing payment instead of recording a new one.
    paymentId?: string | null;
    onHide: () => void;
    onSaved: () => void;
}

// Quick payment entry: card, date and amount are all that is needed. Any past date is accepted, for late entries.
const PaymentDialog = ({ visible, cards, creditCardId, paymentId, onHide, onSaved }: Props) => {
    const { showSuccess, showError } = useToast();
    const [saving, setSaving] = useState(false);
    const [editValues, setEditValues] = useState<PaymentForm | null>(null);
    // Archived cards stay selectable when editing, so a payment on one can still be changed.
    const fields = useMemo(() => paymentFields(cards, !!paymentId), [cards, paymentId]);
    // A single active card is preselected.
    const newValues = useMemo(() => paymentDefaults(creditCardId ?? (cards.filter((c) => c.isActive).length === 1 ? cards.find((c) => c.isActive)!.creditCardId : '')), [creditCardId, cards, visible]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setEditValues(null);
        if (!visible || !paymentId) return;
        creditCardPaymentService
            .getById(paymentId)
            .then((payment) => setEditValues(paymentToForm(payment)))
            .catch((error) => {
                showError(error);
                onHide();
            });
    }, [visible, paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async (form: PaymentForm) => {
        setSaving(true);
        try {
            if (paymentId) await creditCardPaymentService.update(paymentId, paymentToRequest(form));
            else await creditCardPaymentService.create(paymentToRequest(form));
            showSuccess(paymentId ? 'Payment updated. Its statement period was recalculated.' : 'Payment recorded.');
            onSaved();
            onHide();
        } catch (error) {
            showError(error);
        } finally {
            setSaving(false);
        }
    };

    const values = paymentId ? editValues : newValues;
    if (!visible || !values) return null;

    return <EntityFormDialog visible={visible} header={paymentId ? 'Edit payment' : 'Record payment'} fields={fields} schema={paymentSchema} values={values} saving={saving} onHide={onHide} onSubmit={save} />;
};

export default PaymentDialog;
