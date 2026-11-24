import { DebtStatus } from '@/app/services/credit-card.service';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactPeso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 });

// "₱105,000.00"
export const formatPeso = (value: number | null | undefined) => (value === null || value === undefined ? '—' : peso.format(value));

// "+₱5,000.00" / "−₱10,000.00", for movements where the sign carries the meaning.
export const formatSignedPeso = (value: number) => (value > 0 ? `+${peso.format(value)}` : value < 0 ? `−${peso.format(-value)}` : peso.format(0));

// Axis ticks: "₱105K", "₱1.2M".
export const formatCompactPeso = (value: number) => compactPeso.format(value);

// "yyyy-MM-dd" from the local calendar day, so the time zone never shifts the date.
export const toApiDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseApiDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const today = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// "Oct 31, 2026"
export const formatDate = (value: string | null | undefined) => (value ? parseApiDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

// "Oct 1 – Oct 31, 2026"
export const formatPeriod = (start: string, end: string) => {
    const startDate = parseApiDate(start);
    const endDate = parseApiDate(end);
    const startText = startDate.toLocaleDateString('en-US', startDate.getFullYear() === endDate.getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startText} – ${formatDate(end)}`;
};

// "2026-10" → "Oct 2026"
export const formatMonth = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Green when debt went down, red when it went up, neutral otherwise.
export const movementClass = (value: number) => (value < 0 ? 'debt-down' : value > 0 ? 'debt-up' : 'debt-neutral');

// Null = neutral; the tag then takes the debt-tag-pending style.
export const statusSeverity = (status: DebtStatus) => (status === 'Decreased' ? 'success' : status === 'Increased' ? 'danger' : null);
