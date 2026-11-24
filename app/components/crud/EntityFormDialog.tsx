import { useEffect, useRef } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodType } from 'zod';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import FormField, { FormFieldConfig } from './FormField';

interface Props<TForm extends FieldValues> {
    visible: boolean;
    header: string;
    fields: FormFieldConfig[];
    schema: ZodType<TForm>;
    values: TForm;
    saving: boolean;
    // Dialog width on wide screens; below 1280px a wide dialog takes 95vw.
    width?: string;
    onHide: () => void;
    onSubmit: (values: TForm) => void;
}

const FORM_ID = 'entity-form';

const EntityFormDialog = <TForm extends FieldValues>({ visible, header, fields, schema, values, saving, width, onHide, onSubmit }: Props<TForm>) => {
    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors }
    } = useForm<TForm>({ resolver: zodResolver(schema), defaultValues: values as any });

    useEffect(() => {
        if (visible) reset(values);
    }, [visible, values, reset]);

    const current = watch();
    const shownFields = fields.filter((field) => !field.hidden?.(current));
    const hiddenKey = fields
        .filter((field) => !shownFields.includes(field))
        .map((field) => field.name)
        .join(',');

    // A field that becomes hidden takes its hiddenValue, so validation and the saved record never see a stale value.
    useEffect(() => {
        const hidden = hiddenKey.split(',');
        fields.forEach((field) => {
            if (field.hiddenValue !== undefined && hidden.includes(field.name)) setValue(field.name as any, field.hiddenValue as any);
        });
    }, [hiddenKey, fields, setValue]);

    const autoFillKey = fields
        .filter((field) => field.autoFillWhen?.(current))
        .map((field) => field.name)
        .join(',');
    const previousAutoFillKey = useRef(autoFillKey);

    // Fills only when the condition turns true, so opening a saved record never overwrites its values.
    useEffect(() => {
        const previous = previousAutoFillKey.current.split(',');
        const active = autoFillKey.split(',');
        previousAutoFillKey.current = autoFillKey;
        fields.forEach((field) => {
            if (field.autoFillValue !== undefined && active.includes(field.name) && !previous.includes(field.name)) setValue(field.name as any, field.autoFillValue as any, { shouldValidate: true });
        });
    }, [autoFillKey, fields, setValue]);

    const footer = (
        <div className="flex justify-content-between">
            <Button label="Cancel" icon="pi pi-times" severity="danger" onClick={onHide} disabled={saving} />
            <Button label="Save" icon="pi pi-check" type="submit" form={FORM_ID} loading={saving} />
        </div>
    );

    return (
        <Dialog visible={visible} header={header} modal footer={footer} onHide={onHide} className="p-fluid" style={{ width: width ?? '40rem' }} breakpoints={width ? { '1280px': '95vw' } : { '640px': '95vw' }}>
            <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="formgrid grid pt-2">
                {shownFields.map((field) => (
                    <FormField key={field.name} config={field} control={control} errors={errors} />
                ))}
            </form>
        </Dialog>
    );
};

export default EntityFormDialog;
