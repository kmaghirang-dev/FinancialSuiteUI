import { ReactNode } from 'react';
import { Control, Controller, FieldError, FieldErrors } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';
import DropDownDetailSelect from '../DropDownDetailSelect';

export type FormFieldType = 'text' | 'textarea' | 'password' | 'integer' | 'decimal' | 'select' | 'dropdownDetail' | 'date' | 'custom';

// 'custom': the field renders its own control, e.g. a list of rows; error holds the field's nested errors.
export interface CustomFieldProps {
    id: string;
    value: any;
    onChange: (value: any) => void;
    error?: FieldError | FieldErrors;
    disabled?: boolean;
}

export interface FormFieldConfig {
    name: string;
    label: string;
    type: FormFieldType;
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
    maxDate?: Date; // 'date'
    rows?: number; // 'textarea': starting height in lines (default 3)
    suffix?: string;
    quickValues?: { label: string; value: number }[]; // 'integer'/'decimal': small buttons beside the input that set these values
    placeholder?: string;
    options?: { label: string; value: unknown }[]; // 'select'
    category?: string; // 'dropdownDetail' (required there)
    half?: boolean; // half width from md breakpoint up
    disabled?: boolean; // shown but not editable; its value is still submitted
    hidden?: (values: Record<string, any>) => boolean; // left out of the form while true for the current values
    hiddenValue?: unknown; // value set (and submitted) while hidden
    autoFillWhen?: (values: Record<string, any>) => boolean; // when this becomes true, the field takes autoFillValue and stays editable
    autoFillValue?: unknown;
    render?: (props: CustomFieldProps) => ReactNode; // 'custom' (required there)
}

interface Props {
    config: FormFieldConfig;
    control: Control<any>;
    errors: FieldErrors;
}

const FormField = ({ config, control, errors }: Props) => {
    const { name, label, type, required, maxLength, min, max, maxDate, rows, suffix, quickValues, placeholder, options, category, half, disabled, render } = config;
    const error = errors[name]?.message;
    const invalid = !!error;

    return (
        <div className={classNames('field col-12', { 'md:col-6': half })}>
            <label htmlFor={name}>
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => {
                    switch (type) {
                        case 'textarea':
                            return <InputTextarea id={name} {...field} value={field.value ?? ''} rows={rows ?? 3} autoResize maxLength={maxLength} placeholder={placeholder} disabled={disabled} className={classNames({ 'p-invalid': invalid })} />;
                        case 'password':
                            return (
                                <Password
                                    inputId={name}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    onBlur={field.onBlur}
                                    feedback={false}
                                    toggleMask
                                    maxLength={maxLength}
                                    disabled={disabled}
                                    className={classNames('w-full', { 'p-invalid': invalid })}
                                    inputClassName="w-full"
                                />
                            );
                        case 'integer':
                        case 'decimal': {
                            const input = (
                                <InputNumber
                                    inputId={name}
                                    value={field.value ?? null}
                                    onValueChange={(e) => field.onChange(e.value ?? null)}
                                    onBlur={field.onBlur}
                                    min={min}
                                    max={max}
                                    showButtons
                                    suffix={suffix}
                                    useGrouping={false}
                                    minFractionDigits={type === 'decimal' ? 1 : undefined}
                                    maxFractionDigits={type === 'decimal' ? 2 : undefined}
                                    disabled={disabled}
                                    className={classNames({ 'p-invalid': invalid, 'quick-value-input': quickValues?.length })}
                                    inputClassName={classNames({ 'w-full': quickValues?.length })}
                                />
                            );
                            if (!quickValues?.length) return input;
                            return (
                                <div className="flex align-items-center gap-1">
                                    {input}
                                    {quickValues.map((quick) => (
                                        <Button
                                            key={quick.value}
                                            type="button"
                                            label={quick.label}
                                            size="small"
                                            severity="secondary"
                                            text
                                            className="quick-value-button"
                                            disabled={disabled || field.value === quick.value}
                                            onClick={() => field.onChange(quick.value)}
                                            aria-label={`Set ${label} to ${quick.value}`}
                                        />
                                    ))}
                                </div>
                            );
                        }
                        case 'select':
                            return (
                                <Dropdown
                                    inputId={name}
                                    value={field.value}
                                    options={options}
                                    optionLabel="label"
                                    optionValue="value"
                                    onChange={(e) => field.onChange(e.value ?? null)}
                                    placeholder={placeholder}
                                    showClear={!required}
                                    disabled={disabled}
                                    className={classNames({ 'p-invalid': invalid })}
                                />
                            );
                        case 'date':
                            return (
                                <Calendar
                                    inputId={name}
                                    value={field.value ?? null}
                                    onChange={(e) => field.onChange(e.value ?? null)}
                                    onBlur={field.onBlur}
                                    dateFormat="yy-mm-dd"
                                    showIcon
                                    maxDate={maxDate}
                                    disabled={disabled}
                                    className={classNames({ 'p-invalid': invalid })}
                                />
                            );
                        case 'custom':
                            return <>{render?.({ id: name, value: field.value, onChange: field.onChange, error: errors[name] as FieldError | FieldErrors | undefined, disabled })}</>;
                        case 'dropdownDetail':
                            return <DropDownDetailSelect id={name} value={field.value ?? null} onChange={field.onChange} category={category ?? ''} invalid={invalid} disabled={disabled} />;
                        default:
                            return <InputText id={name} {...field} value={field.value ?? ''} maxLength={maxLength} placeholder={placeholder} disabled={disabled} className={classNames({ 'p-invalid': invalid })} />;
                    }
                }}
            />
            {typeof error === 'string' && <small className="p-error">{error}</small>}
        </div>
    );
};

export default FormField;
