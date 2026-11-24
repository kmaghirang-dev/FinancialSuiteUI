import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api-client';
import { PagedQuery, PagedResult } from '../services/http-service';

export interface TableState {
    first: number;
    rows: number;
    sortField?: string;
    sortOrder?: 1 | 0 | -1 | null;
}

export interface DefaultSort {
    field: string;
    order: 1 | -1;
}

// Server-side paging, sorting and searching for a lazy DataTable.
// Changing filterKey (a filter baked into fetchPage) refetches from the first page.
// initialRows is the page size of the first request (10 unless the page asks for more).
export const usePagedData = <T>(fetchPage: (query: PagedQuery) => Promise<PagedResult<T>>, defaultSort?: DefaultSort, filterKey?: string, initialRows = 10) => {
    const [table, setTable] = useState<TableState>({ first: 0, rows: initialRows, sortField: defaultSort?.field, sortOrder: defaultSort?.order });
    const [search, setSearch] = useState('');
    const [searchPhrase, setSearchPhrase] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [result, setResult] = useState<PagedResult<T> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Nested-resource services are rebuilt on every render; keep the latest without refetching.
    const fetchRef = useRef(fetchPage);
    fetchRef.current = fetchPage;

    const filterKeyRef = useRef(filterKey);
    useEffect(() => {
        if (filterKeyRef.current === filterKey) return;
        filterKeyRef.current = filterKey;
        setTable((state) => ({ ...state, first: 0 }));
    }, [filterKey]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const phrase = search.trim();
            if (phrase === searchPhrase) return;
            setSearchPhrase(phrase);
            setTable((state) => ({ ...state, first: 0 }));
        }, 400);
        return () => clearTimeout(timeout);
    }, [search, searchPhrase]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        fetchRef
            .current({
                pageNumber: table.first / table.rows + 1,
                pageSize: table.rows,
                searchPhrase: searchPhrase || undefined,
                sortBy: table.sortOrder ? table.sortField : undefined,
                sortDirection: table.sortOrder === -1 ? 'Descending' : 'Ascending'
            })
            .then((data) => {
                if (cancelled) return;
                setResult(data);
                setError(null);
            })
            .catch((e) => !cancelled && setError(getErrorMessage(e)))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [table, searchPhrase, refreshKey]);

    const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

    return {
        items: result?.items ?? [],
        totalCount: result?.totalCount ?? 0,
        table,
        setTable,
        search,
        setSearch,
        loading,
        error,
        reload
    };
};
