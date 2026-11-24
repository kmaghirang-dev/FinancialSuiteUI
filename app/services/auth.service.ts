import apiClient from './api-client';
import { clearSession, setSession } from './auth-session';

interface AccessTokenResponse {
    tokenType: string;
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
}

const authService = {
    login: async (email: string, password: string) => {
        const tokens = await apiClient<AccessTokenResponse>('identity/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            anonymous: true
        });
        setSession({ email, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    },

    logout: () => {
        clearSession();
        window.location.href = '/login';
    }
};

export default authService;
