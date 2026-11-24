import { Tag } from 'primereact/tag';
import { DebtStatus } from '@/app/services/credit-card.service';
import { statusSeverity } from './format';

const ICONS: Record<DebtStatus, string> = {
    Increased: 'pi pi-arrow-up',
    Decreased: 'pi pi-arrow-down',
    'No change': 'pi pi-minus'
};

// Pending = an open period, whose activity is unknown until the next statement.
const DebtStatusTag = ({ status }: { status: DebtStatus | 'Pending' | 'Baseline' }) => {
    if (status === 'Pending') return <Tag value="Pending next statement" icon="pi pi-clock" className="debt-tag-pending" rounded />;
    if (status === 'Baseline') return <Tag value="Baseline" icon="pi pi-flag" className="debt-tag-baseline" rounded />;
    return (
        <Tag
            value={status === 'Increased' ? 'Debt increased' : status === 'Decreased' ? 'Debt decreased' : 'No change'}
            icon={ICONS[status]}
            severity={statusSeverity(status)}
            className={status === 'No change' ? 'debt-tag-pending' : undefined}
            rounded
        />
    );
};

export default DebtStatusTag;
