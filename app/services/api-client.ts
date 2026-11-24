import { clearSession, getSession, setSession } from './auth-session';

const API_BASE = '/api/';

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

type ApiOptions = RequestInit & { anonymous?: boolean };

const send = (endpoint: string, options: RequestInit, token?: string) =>
    fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            // FormData bodies (file uploads) need the browser to set the multipart boundary itself.
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        },
        cache: 'no-store'
    });

const readBody = async (response: Response) => {
    const text = await response.text();
    if (!text) return undefined;
    return response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
};

const statusMessages: Record<number, string> = {
    400: 'The request is invalid.',
    401: 'Your session has expired. Please sign in again.',
    403: "You don't have permission to perform this action.",
    404: 'The requested record was not found.',
    500: 'An internal error occurred.'
};

// Validation errors come back as ProblemDetails ({ errors: { Field: [messages] } }); other errors are plain text.
const readError = async (response: Response) => {
    const body = await readBody(response).catch(() => undefined);
    if (body && typeof body === 'object') {
        if (body.errors) return Object.values(body.errors as Record<string, string[]>).flat().join(' ');
        if (body.detail || body.title) return body.detail ?? body.title;
    }
    if (typeof body === 'string' && body.trim()) return body;
    return statusMessages[response.status] ?? `Request failed (${response.status}).`;
};

let refreshing: Promise<boolean> | null = null;

const refreshSession = () => {
    const session = getSession();
    if (!session?.refreshToken) return Promise.resolve(false);

    // Concurrent 401s share one refresh request.
    refreshing ??= send('identity/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) })
        .then(async (response) => {
            if (!response.ok) return false;
            const tokens = await response.json();
            setSession({ ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            return true;
        })
        .catch(() => false)
        .finally(() => (refreshing = null));

    return refreshing;
};

const request = async (endpoint: string, { anonymous, ...options }: ApiOptions): Promise<Response> => {
    if (anonymous) {
        const response = await send(endpoint, options);
        if (!response.ok) throw new ApiError(await readError(response), response.status);
        return response;
    }

    let response = await send(endpoint, options, getSession()?.accessToken);
    if (response.status === 401 && (await refreshSession())) {
        response = await send(endpoint, options, getSession()?.accessToken);
    }

    if (response.status === 401) {
        clearSession();
        window.location.href = '/login';
        throw new ApiError(statusMessages[401], 401);
    }

    if (!response.ok) throw new ApiError(await readError(response), response.status);
    return response;
};

const apiClient = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => readBody(await request(endpoint, options));

// Saves a file response (e.g. a generated document) in the browser, using the file name from Content-Disposition when the API sends one.
export const downloadFile = async (endpoint: string, fallbackFileName: string, options: ApiOptions = {}) => {
    const response = await request(endpoint, options);
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
    const fileName = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackFileName;

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
};

export const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'An unexpected error occurred.');

export default apiClient;
