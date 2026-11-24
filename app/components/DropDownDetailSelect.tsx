import { useMemo } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { classNames } from 'primereact/utils';
import { useDropDownOptions } from '../hooks/useDropDownOptions';

interface Props {
    id: string;
    value: string | null;
    onChange: (value: string | null) => void;
    // Dropdown category Value (see DROPDOWN_CATEGORIES); only its details are offered.
    category: string;
    invalid?: boolean;
    disabled?: boolean;
}

const DropDownDetailSelect = ({ id, value, onChange, category, invalid, disabled }: Props) => {
    const { details, loading, error } = useDropDownOptions(category);

    const options = useMemo(() => details.map((d) => ({ label: d.displayValue, value: d.dropDownDetailId })), [details]);

    return (
        <>
            <Dropdown
                inputId={id}
                value={value}
                options={options}
                optionLabel="label"
                optionValue="value"
                onChange={(e) => onChange(e.value ?? null)}
                placeholder={loading ? 'Loading options…' : 'Select an option'}
                emptyMessage="No options available"
                disabled={disabled || loading || !!error}
                filter
                className={classNames('w-full', { 'p-invalid': invalid })}
            />
            {error && <small className="p-error block mt-1">Options unavailable: {error}</small>}
        </>
    );
};

export default DropDownDetailSelect;
