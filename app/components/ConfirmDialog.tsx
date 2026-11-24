import { ReactNode } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

interface Props {
    visible: boolean;
    message: ReactNode;
    header?: string;
    confirmLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onHide: () => void;
}

const ConfirmDialog = ({ visible, message, header = 'Confirm', confirmLabel = 'Delete', loading, onConfirm, onHide }: Props) => {
    const footer = (
        <div className="flex justify-content-between">
            <Button label="Cancel" icon="pi pi-times" severity="secondary" onClick={onHide} disabled={loading} />
            <Button label={confirmLabel} icon="pi pi-check" severity="danger" onClick={onConfirm} loading={loading} />
        </div>
    );

    return (
        <Dialog visible={visible} header={header} modal footer={footer} onHide={onHide} style={{ width: '30rem' }} breakpoints={{ '640px': '95vw' }}>
            <div className="flex align-items-center gap-3">
                <i className="pi pi-exclamation-triangle text-orange-400" style={{ fontSize: '2rem' }} />
                <span>{message}</span>
            </div>
        </Dialog>
    );
};

export default ConfirmDialog;
