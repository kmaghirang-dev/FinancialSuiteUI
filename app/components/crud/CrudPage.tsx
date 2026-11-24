'use client';
import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { FieldValues } from 'react-hook-form';
import { ZodType } from 'zod';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { AuditFields } from '@/app/types';
import { usePagedData, DefaultSort } from '@/app/hooks/usePagedData';
import { PAGE_SIZES, PagedQuery, PagedResult } from '@/app/services/http-service';
import { useToast } from '@/layout/context/toastcontext';
import ConfirmDialog from '../ConfirmDialog';
import PageHeader from '../PageHeader';
import DetailsDialog from './DetailsDialog';
import EntityFormDialog from './EntityFormDialog';
import { FormFieldConfig } from './FormField';

export interface CrudColumn<T> {
    field: string;
    header: string;
    // Backend SortBy name; the column is sortable only when the API allows it.
    sortField?: string;
    body?: (row: T) => ReactNode;
    // Table cell with row controls; the details dialog keeps showing body. reload refetches the current page.
    cell?: (row: T, reload: () => void) => ReactNode;
    // Table layout only: column width and alignment of the header and cells.
    style?: CSSProperties;
    align?: 'left' | 'center' | 'right';
    // Details dialog only: the value takes the full row instead of half.
    detailWide?: boolean;
}

// The actions a page offers are exactly the methods its service implements.
export interface CrudService<T, TForm> {
    getPaginated: (query: PagedQuery) => Promise<PagedResult<T>>;
    getById: (id: string) => Promise<T>;
    getForEdit?: (id: string) => Promise<T>;
    create?: (data: TForm) => Promise<unknown>;
    update?: (id: string, data: TForm) => Promise<unknown>;
    toggle?: (id: string, isActive: boolean) => Promise<unknown>;
    delete?: (id: string) => Promise<unknown>;
}

export interface CrudForm<T, TForm> {
    fields: FormFieldConfig[];
    // Fields for New when they differ from Edit (e.g. a value the page fixes for new records).
    createFields?: FormFieldConfig[];
    schema: ZodType<TForm>;
    defaultValues: TForm;
    toFormValues: (item: T) => TForm;
    // Adds a Copy row action: the New form opens prefilled with the record's toFormValues and saves a new record.
    copyable?: boolean;
    // Wider form dialog, e.g. for side-by-side half fields; defaults to 40rem.
    dialogWidth?: string;
}

interface Props<T, TForm> {
    title: string;
    description?: string;
    icon: string;
    entityName: string;
    service: CrudService<T, TForm>;
    idField: keyof T & string;
    nameField: keyof T & string;
    columns: CrudColumn<T>[];
    // Extra fields shown only in the details dialog.
    detailColumns?: CrudColumn<T>[];
    // Wider details dialog, e.g. for long text; defaults to 40rem.
    detailsWidth?: string;
    searchable?: boolean;
    // Rendered above the table; filterKey must change whenever the filter applied by service.getPaginated changes.
    filters?: ReactNode;
    filterKey?: string;
    defaultSort?: DefaultSort;
    form?: CrudForm<T, TForm>;
    // reload refetches the current page, e.g. after a row action changed the record.
    rowActions?: (row: T, reload: () => void) => ReactNode;
    toolbarActions?: (reload: () => void) => ReactNode;
    onChanged?: () => void;
    // Shown as the rightmost toolbar button.
    backLink?: { href: string; label: string };
    // One table with every record and no paginator; the API must accept SHOW_ALL_PAGE_SIZE as a page size.
    showAll?: boolean;
    // Adds the record's nameField to the Edit dialog title, e.g. "Edit Character: Albedo".
    nameInEditHeader?: boolean;
}

// Page size requested when showAll is set.
export const SHOW_ALL_PAGE_SIZE = 1000;

interface FormState<TForm> {
    visible: boolean;
    editingId: string | null;
    editingName?: string;
    values: TForm;
}

const CrudPage = <T extends Partial<AuditFields>, TForm extends FieldValues>(props: Props<T, TForm>) => {
    const {
        title,
        description,
        icon,
        entityName,
        service,
        idField,
        nameField,
        columns,
        detailColumns = [],
        detailsWidth,
        searchable,
        filters,
        filterKey,
        defaultSort,
        form,
        rowActions,
        toolbarActions,
        onChanged,
        backLink,
        showAll,
        nameInEditHeader
    } = props;
    const { showSuccess, showError } = useToast();
    const data = usePagedData(service.getPaginated, defaultSort, filterKey, showAll ? SHOW_ALL_PAGE_SIZE : undefined);
    const [formState, setFormState] = useState<FormState<TForm> | null>(null);
    const [saving, setSaving] = useState(false);
    const [viewing, setViewing] = useState<T | null>(null);
    const [confirming, setConfirming] = useState<{ row: T; kind: 'delete' | 'disable' } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const idOf = (row: T) => String(row[idField]);
    const canEdit = !!(service.update && form);

    useEffect(() => {
        if (data.error) showError(data.error);
    }, [data.error, showError]);

    const run = async (action: () => Promise<unknown>, message: string) => {
        try {
            await action();
            showSuccess(message);
            data.reload();
            onChanged?.();
            return true;
        } catch (error) {
            showError(error);
            return false;
        }
    };

    // Rows come from the list; details and edit values come from GetById so they reflect the stored record.
    const withRecord = async (row: T, use: (item: T) => void, load = service.getById) => {
        setBusyId(idOf(row));
        try {
            use({ ...row, ...(await load(idOf(row))) });
        } catch (error) {
            showError(error);
        } finally {
            setBusyId(null);
        }
    };

    const openCreate = () => form && setFormState({ visible: true, editingId: null, values: form.defaultValues });

    const openEdit = (row: T) => withRecord(row, (item) => setFormState({ visible: true, editingId: idOf(row), editingName: String(row[nameField] ?? ''), values: form!.toFormValues(item) }), service.getForEdit ?? service.getById);

    const openCopy = (row: T) => withRecord(row, (item) => setFormState({ visible: true, editingId: null, values: form!.toFormValues(item) }));

    const save = async (values: TForm) => {
        if (!formState) return;
        const { editingId } = formState;
        setSaving(true);
        const ok = await run(() => (editingId ? service.update!(editingId, values) : service.create!(values)), `${entityName} ${editingId ? 'updated' : 'created'} successfully.`);
        setSaving(false);
        if (ok) setFormState(null);
    };

    // The API's list endpoints only return active records, so toggling a listed row always disables it
    // and hides it from every list. Delete is the same soft delete: services send IsActive = false, never an HTTP DELETE.
    const confirmAction = async () => {
        if (!confirming) return;
        const { row, kind } = confirming;
        setSaving(true);
        const ok = await run(() => (kind === 'delete' ? service.delete!(idOf(row)) : service.toggle!(idOf(row), false)), `${entityName} ${kind === 'delete' ? 'deleted' : 'disabled'}.`);
        setSaving(false);
        if (ok) setConfirming(null);
    };

    const actionsBody = (row: T) => (
        <div className="flex gap-1 justify-content-end">
            {rowActions?.(row, data.reload)}
            <Button icon="pi pi-eye" rounded text severity="secondary" aria-label="View details" tooltip="View details" tooltipOptions={{ position: 'top' }} onClick={() => withRecord(row, setViewing)} disabled={busyId === idOf(row)} />
            {canEdit && <Button icon="pi pi-pencil" rounded text aria-label="Edit" tooltip="Edit" tooltipOptions={{ position: 'top' }} onClick={() => openEdit(row)} disabled={busyId === idOf(row)} />}
            {service.create && form?.copyable && (
                <Button icon="pi pi-copy" rounded text severity="help" aria-label="Copy" tooltip="Copy to a new record" tooltipOptions={{ position: 'top' }} onClick={() => openCopy(row)} disabled={busyId === idOf(row)} />
            )}
            {service.toggle && <Button icon="pi pi-ban" rounded text severity="warning" aria-label="Disable" tooltip="Disable" tooltipOptions={{ position: 'top' }} onClick={() => setConfirming({ row, kind: 'disable' })} />}
            {service.delete && <Button icon="pi pi-trash" rounded text severity="danger" aria-label="Delete" tooltip="Delete" tooltipOptions={{ position: 'top' }} onClick={() => setConfirming({ row, kind: 'delete' })} />}
        </div>
    );

    const tableHeader = (
        <div className="flex flex-column sm:flex-row sm:align-items-center sm:justify-content-between gap-2">
            <span className="text-color-secondary">{data.totalCount} record(s)</span>
            {searchable && (
                <span className="p-input-icon-left w-full sm:w-auto">
                    <i className="pi pi-search" />
                    <InputText type="search" value={data.search} onChange={(e) => data.setSearch(e.target.value)} placeholder="Search..." className="w-full sm:w-18rem" />
                </span>
            )}
        </div>
    );

    return (
        <>
            <PageHeader title={title} description={description} icon={icon} />

            <div className="page-toolbar flex flex-wrap align-items-center gap-2 mb-3">
                {service.create && form && <Button label={`New ${entityName}`} icon="pi pi-plus" onClick={openCreate} />}
                <div className="flex flex-wrap gap-2 ml-auto">
                    {toolbarActions?.(data.reload)}
                    <Button icon="pi pi-refresh" severity="info" tooltip="Refresh" tooltipOptions={{ position: 'top' }} onClick={data.reload} />
                    {backLink && (
                        <Link href={backLink.href}>
                            <Button label={backLink.label} icon="pi pi-arrow-left" severity="secondary" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="card">
                {filters}
                <DataTable
                    value={data.items}
                    dataKey={idField}
                    lazy
                    paginator={!showAll}
                    first={data.table.first}
                    rows={data.table.rows}
                    totalRecords={data.totalCount}
                    rowsPerPageOptions={PAGE_SIZES}
                    onPage={(e) => data.setTable((state) => ({ ...state, first: e.first, rows: e.rows }))}
                    sortField={data.table.sortField}
                    sortOrder={data.table.sortOrder}
                    onSort={(e) => data.setTable((state) => ({ ...state, first: 0, sortField: e.sortField, sortOrder: e.sortOrder }))}
                    removableSort
                    loading={data.loading}
                    header={tableHeader}
                    emptyMessage="No records found."
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                    stripedRows
                >
                    {columns.map((column) => (
                        <Column
                            key={column.field}
                            field={column.field}
                            header={column.header}
                            sortField={column.sortField}
                            sortable={!!column.sortField}
                            style={column.style}
                            align={column.align}
                            alignHeader={column.align}
                            body={column.cell ? (row: T) => column.cell!(row, data.reload) : column.body}
                        />
                    ))}
                    <Column body={actionsBody} style={{ width: '1%' }} className="white-space-nowrap" />
                </DataTable>
            </div>

            {form && formState && (
                <EntityFormDialog
                    visible={formState.visible}
                    header={formState.editingId && nameInEditHeader && formState.editingName ? `Edit ${entityName}: ${formState.editingName}` : `${formState.editingId ? 'Edit' : 'New'} ${entityName}`}
                    fields={formState.editingId ? form.fields : form.createFields ?? form.fields}
                    schema={form.schema}
                    values={formState.values}
                    saving={saving}
                    width={form.dialogWidth}
                    onHide={() => setFormState(null)}
                    onSubmit={save}
                />
            )}

            <DetailsDialog
                header={`${entityName} details`}
                item={viewing}
                details={[...columns, ...detailColumns].map((column) => ({ label: column.header, value: viewing ? (column.body ? column.body(viewing) : String((viewing as any)[column.field] ?? '')) : null, wide: column.detailWide }))}
                width={detailsWidth}
                onHide={() => setViewing(null)}
            />

            <ConfirmDialog
                visible={!!confirming}
                header={`${confirming?.kind === 'disable' ? 'Disable' : 'Delete'} ${entityName.toLowerCase()}`}
                message={
                    confirming?.kind === 'disable' ? (
                        <>
                            Disable <b>{String(confirming.row[nameField] ?? '')}</b>? Disabled records are hidden from all lists.
                        </>
                    ) : (
                        <>
                            Are you sure you want to delete <b>{confirming ? String(confirming.row[nameField] ?? '') : ''}</b>? It will be hidden from all lists, but its record and history are kept.
                        </>
                    )
                }
                confirmLabel={confirming?.kind === 'disable' ? 'Disable' : 'Delete'}
                loading={saving}
                onConfirm={confirmAction}
                onHide={() => setConfirming(null)}
            />
        </>
    );
};

export default CrudPage;
