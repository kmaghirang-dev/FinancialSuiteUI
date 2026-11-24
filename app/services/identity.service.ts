import apiClient from './api-client';

export interface AccountInfo {
    email: string;
    isEmailConfirmed: boolean;
}

export interface UserDetailsRequest {
    dateOfBirth: string | null; // "yyyy-MM-dd"
    nationality: string;
}

export interface UserRoleRequest {
    userEmail: string;
    role: string;
}

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

// Roles seeded by the API (Domain/Constants/UserRoles.cs).
export const USER_ROLES = ['User', 'Admin', 'SuperAdmin'];

const identityService = {
    getAccountInfo: () => apiClient<AccountInfo>('identity/manage/info'),
    changePassword: (data: ChangePasswordRequest) => apiClient<AccountInfo>('identity/manage/info', { method: 'POST', body: JSON.stringify(data) }),
    updateUserDetails: (data: UserDetailsRequest) => apiClient<void>('identity/user', { method: 'PATCH', body: JSON.stringify(data) }),
    assignRole: (data: UserRoleRequest) => apiClient<void>('identity/userRole', { method: 'PATCH', body: JSON.stringify(data) }),
    unassignRole: (data: UserRoleRequest) => apiClient<void>('identity/userRole', { method: 'DELETE', body: JSON.stringify(data) })
};

export default identityService;
