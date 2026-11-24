import { z } from 'zod';
import { FormFieldConfig } from '@/app/components/crud/FormField';
import { CreditCard, CreditCardPayment, CreditCardPaymentRequest } from '@/app/services/credit-card.service';
import { cardOptions } from './CreditCardFilterBar';
import { parseApiDate, toApiDate, today } from './format';

export interface PaymentForm {
    creditCardId: string;
    paymentDate: Date;
    amount: number;
    paymentReference: string;
    notes: string;
}

// Mirrors CreditCardPaymentFieldsValidator. Any past date is allowed, so late entries can be recorded; a payment
// on or before the card's initial balance date is kept but not counted (it is already in that balance).
export const paymentSchema = z.object({
    creditCardId: z.string({ required_error: 'Credit card is required', invalid_type_error: 'Credit card is required' }).min(1, 'Credit card is required'),
    paymentDate: z.date({ invalid_type_error: 'Payment date is required', required_error: 'Payment date is required' }).refine((date) => date <= today(), 'Payment date cannot be in the future'),
    amount: z.number({ invalid_type_error: 'Amount is required' }).gt(0, 'Amount must be greater than 0').max(999_999_999_999.99, 'Amount is too large'),
    paymentReference: z.string().max(100, 'Reference must be at most 100 characters'),
    notes: z.string().max(1000, 'Notes must be at most 1000 characters')
});

// includeArchived keeps archived cards selectable, so an existing payment on one can still be edited.
export const paymentFields = (cards: CreditCard[], includeArchived = false): FormFieldConfig[] => {
    const options = cardOptions(cards.filter((card) => includeArchived || card.isActive));
    return [
        { name: 'creditCardId', label: 'Credit card', type: 'select', required: true, options, placeholder: 'Select a card' },
        { name: 'paymentDate', label: 'Payment date', type: 'date', required: true, maxDate: today(), half: true },
        { name: 'amount', label: 'Amount (₱)', type: 'decimal', required: true, min: 0, half: true },
        { name: 'paymentReference', label: 'Reference', type: 'text', maxLength: 100, placeholder: 'Optional, e.g. a confirmation number' },
        { name: 'notes', label: 'Notes', type: 'textarea', maxLength: 1000 }
    ];
};

export const paymentDefaults = (creditCardId = ''): PaymentForm => ({ creditCardId, paymentDate: today(), amount: null as unknown as number, paymentReference: '', notes: '' });

export const paymentToForm = (payment: CreditCardPayment): PaymentForm => ({
    creditCardId: payment.creditCardId,
    paymentDate: parseApiDate(payment.paymentDate),
    amount: payment.amount,
    paymentReference: payment.paymentReference ?? '',
    notes: payment.notes ?? ''
});

export const paymentToRequest = (form: PaymentForm): CreditCardPaymentRequest => ({
    creditCardId: form.creditCardId,
    paymentDate: toApiDate(form.paymentDate),
    amount: form.amount,
    paymentReference: form.paymentReference || null,
    notes: form.notes || null
});
