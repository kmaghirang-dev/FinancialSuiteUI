import { useEffect, useState } from 'react';
import { getErrorMessage } from '../services/api-client';
import { DropDownDetail, getDropDownDetailsByCategory } from '../services/dropdown.service';

// Each category is loaded once and shared by every select/lookup using it; the dropdown admin pages invalidate it.
const cache = new Map<string, Promise<DropDownDetail[]>>();

const loadDetails = (category: string) => {
    let details = cache.get(category);
    if (!details) {
        details = getDropDownDetailsByCategory(category).catch((error) => {
            cache.delete(category);
            throw error;
        });
        cache.set(category, details);
    }
    return details;
};

export const invalidateDropDownOptions = () => {
    cache.clear();
};

export const useDropDownOptions = (category: string) => {
    const [details, setDetails] = useState<DropDownDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        if (!category) {
            setDetails([]);
            setError('No dropdown category configured.');
            setLoading(false);
            return;
        }
        loadDetails(category)
            .then((data) => !cancelled && setDetails(data))
            .catch((e) => {
                if (cancelled) return;
                setDetails([]);
                setError(getErrorMessage(e));
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [category]);

    const labelOf = (detailId?: string | null) => {
        if (!detailId) return '';
        const detail = details.find((d) => d.dropDownDetailId === detailId);
        if (detail) return detail.displayValue;
        return loading ? '…' : detailId;
    };

    return { details, loading, error, labelOf };
};
