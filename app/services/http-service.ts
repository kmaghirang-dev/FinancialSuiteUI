import apiClient from './api-client';

export type SortDirection = 'Ascending' | 'Descending';

// Mirrors the GetAllPaginated*Query contract; the API only accepts page sizes 5, 10, 15 and 30.
export interface PagedQuery {
    pageNumber: number;
    pageSize: number;
    searchPhrase?: string;
    sortBy?: string;
    sortDirection?: SortDirection;
}

export interface PagedResult<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    itemsFrom: number;
    itemsTo: number;
    totalCount: number;
    totalPages: number;
}

export const PAGE_SIZES = [5, 10, 15, 30];

const toQueryString = (query: object) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    return params.toString();
};

class HttpService {
    endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    getAll<T>() {
        return apiClient<T[]>(this.endpoint);
    }

    // Filters are extra query-string parameters for endpoints whose query accepts them; empty values are dropped.
    getPaginated<T>(query: PagedQuery, filters?: Record<string, string | undefined>) {
        return apiClient<PagedResult<T>>(`${this.endpoint}/paginated?${toQueryString({ ...query, ...filters })}`);
    }

    // GET {route}/{path}?query for endpoints beyond the standard ones; empty values are dropped.
    getWithQuery<T>(path: string, query: object) {
        return apiClient<T>(`${this.endpoint}/${path}?${toQueryString(query)}`);
    }

    getById<T>(id: string) {
        return apiClient<T>(`${this.endpoint}/${id}`);
    }

    create<T>(data: T) {
        return apiClient<void>(this.endpoint, { method: 'POST', body: JSON.stringify(data) });
    }

    update<T>(id: string, data: T) {
        return apiClient<void>(`${this.endpoint}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    toggle<T>(id: string, data: T) {
        return apiClient<void>(`${this.endpoint}/toggle/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    delete(id: string) {
        return apiClient<void>(`${this.endpoint}/${id}`, { method: 'DELETE' });
    }
}

const createService = (endpoint: string) => new HttpService(endpoint);

export default createService;
