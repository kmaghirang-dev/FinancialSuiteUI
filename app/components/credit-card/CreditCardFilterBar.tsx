'use client';
import { useCallback, useEffect, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';
import { CreditCard, creditCardService } from '@/app/services/credit-card.service';
import { useToast } from '@/layout/context/toastcontext';
import { toApiDate } from './format';

export type PeriodMode = 'all' | 'month' | 'year' | 'custom';

export interface CreditCardFilterValue {
    creditCardId: string; // '' = all active cards
    mode: PeriodMode;
    month: Date;
    year: number;
    range: (Date | null)[] | null;
}

export const initialFilter = (): CreditCardFilterValue => {
    const now = new Date();
    return { creditCardId: '', mode: 'all', month: new Date(now.getFullYear(), now.getMonth(), 1), year: now.getFullYear(), range: null };
};

// The inclusive API date range for the chosen period, plus a label for subtitles.
export const toDateRange = (filter: CreditCardFilterValue): { from?: string; to?: string; label: string } => {
    switch (filter.mode) {
        case 'month': {
            const start = new Date(filter.month.getFullYear(), filter.month.getMonth(), 1);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            return { from: toApiDate(start), to: toApiDate(end), label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
        }
        case 'year':
            return { from: `${filter.year}-01-01`, to: `${filter.year}-12-31`, label: String(filter.year) };
        case 'custom': {
            const [from, to] = filter.range ?? [];
            const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (!from) return { label: 'All time' };
            return { from: toApiDate(from), to: to ? toApiDate(to) : undefined, label: to ? `${format(from)} – ${format(to)}` : `Since ${format(from)}` };
        }
        default:
            return { label: 'All time' };
    }
};

// Active cards for forms, or every card (archived ones labelled) for filters.
export const useCreditCards = (includeArchived = false) => {
    const { showError } = useToast();
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [loaded, setLoaded] = useState(false);

    const reload = useCallback(() => {
        creditCardService
            .getAll(includeArchived ? '' : 'true')
            .then(setCards)
            .catch(showError)
            .finally(() => setLoaded(true));
    }, [includeArchived, showError]);

    useEffect(reload, [reload]);

    return { cards, loaded, reload };
};

export const cardOptions = (cards: CreditCard[]) => cards.map((card) => ({ label: card.isActive ? card.displayName : `${card.displayName} (deleted)`, value: card.creditCardId }));

const MODE_OPTIONS = [
    { label: 'All time', value: 'all' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' },
    { label: 'Custom', value: 'custom' }
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => ({ label: String(currentYear - i), value: currentYear - i }));

interface Props {
    value: CreditCardFilterValue;
    onChange: (value: CreditCardFilterValue) => void;
    cards: CreditCard[];
    // Hide the period controls on pages that always show the full history.
    showPeriod?: boolean;
}

const CreditCardFilterBar = ({ value, onChange, cards, showPeriod = true }: Props) => {
    const set = (patch: Partial<CreditCardFilterValue>) => onChange({ ...value, ...patch });

    return (
        <div className="flex flex-column md:flex-row md:align-items-end flex-wrap gap-3">
            <div className="flex flex-column gap-2">
                <label htmlFor="credit-card-filter" className="font-medium">
                    Credit card
                </label>
                <Dropdown
                    inputId="credit-card-filter"
                    value={value.creditCardId}
                    options={[{ label: 'All active cards', value: '' }, ...cardOptions(cards)]}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => set({ creditCardId: e.value ?? '' })}
                    className="w-full md:w-16rem"
                />
            </div>
            {showPeriod && (
                <>
                    <div className="flex flex-column gap-2">
                        <span className="font-medium" id="period-mode-label">
                            Period
                        </span>
                        <SelectButton aria-labelledby="period-mode-label" value={value.mode} options={MODE_OPTIONS} onChange={(e) => e.value && set({ mode: e.value })} allowEmpty={false} />
                    </div>
                    {value.mode === 'month' && (
                        <div className="flex flex-column gap-2">
                            <label htmlFor="period-month" className="font-medium">
                                Month
                            </label>
                            <Calendar inputId="period-month" value={value.month} onChange={(e) => e.value && set({ month: e.value as Date })} view="month" dateFormat="MM yy" showIcon className="w-full md:w-14rem" />
                        </div>
                    )}
                    {value.mode === 'year' && (
                        <div className="flex flex-column gap-2">
                            <label htmlFor="period-year" className="font-medium">
                                Year
                            </label>
                            <Dropdown inputId="period-year" value={value.year} options={YEAR_OPTIONS} onChange={(e) => set({ year: e.value })} className="w-full md:w-10rem" />
                        </div>
                    )}
                    {value.mode === 'custom' && (
                        <div className="flex flex-column gap-2">
                            <label htmlFor="period-range" className="font-medium">
                                Date range
                            </label>
                            <Calendar
                                inputId="period-range"
                                value={value.range as any}
                                onChange={(e) => set({ range: (e.value as (Date | null)[]) ?? null })}
                                selectionMode="range"
                                readOnlyInput
                                dateFormat="M d, yy"
                                showIcon
                                showButtonBar
                                placeholder="Pick start and end"
                                className="w-full md:w-18rem"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CreditCardFilterBar;
