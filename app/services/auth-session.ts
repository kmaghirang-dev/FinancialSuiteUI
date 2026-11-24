export interface AuthSession {
    email: string;
    accessToken: string;
    refreshToken: string;
}

const STORAGE_KEY = 'auth-session';

export const getSession = (): AuthSession | null => {
    if (typeof window === 'undefined') return null;
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as AuthSession) : null;
};

export const setSession = (session: AuthSession) => localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

export const clearSession = () => localStorage.removeItem(STORAGE_KEY);

export const getCurrentUserEmail = () => getSession()?.email ?? '';
