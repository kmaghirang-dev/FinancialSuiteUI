import { ReactNode } from 'react';
import { Dialog } from 'primereact/dialog';
import { AuditFields } from '@/app/types';

export interface DetailItem {
    label: string;
    value: ReactNode;
    wide?: boolean; // full row instead of half from md up
}

interface Props {
    header: string;
    item: Partial<AuditFields> | null;
    details: DetailItem[];
    // Dialog width on wide screens; below 1280px a wide dialog takes 95vw.
    width?: string;
    onHide: () => void;
}

const Row = ({ label, value, wide }: DetailItem) => (
    <div className={wide ? 'col-12' : 'col-12 md:col-6'}>
        <div className="text-sm text-color-secondary mb-1">{label}</div>
        {/* PrimeFlex has no pre-line class, so line breaks in long text (e.g. instructions) are kept with an inline style. */}
        <div className="font-medium overflow-hidden text-overflow-ellipsis" style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{value === '' || value === null || value === undefined ? '—' : value}</div>
    </div>
);

const DetailsDialog = ({ header, item, details, width, onHide }: Props) => (
    <Dialog visible={!!item} header={header} modal onHide={onHide} style={{ width: width ?? '40rem' }} breakpoints={width ? { '1280px': '95vw' } : { '640px': '95vw' }}>
        {item && (
            <>
                <div className="grid">
                    {details.map((detail) => (
                        <Row key={detail.label} {...detail} />
                    ))}
                </div>
                <div className="details-audit grid mt-3">
                    <Row label="Created" value={item.createdBy ? `${item.createdBy} · ${item.dateCreated}` : item.dateCreated} />
                    <Row label="Last updated" value={item.updatedBy ? `${item.updatedBy} · ${item.dateUpdated}` : item.dateUpdated} />
                </div>
            </>
        )}
    </Dialog>
);

export default DetailsDialog;
