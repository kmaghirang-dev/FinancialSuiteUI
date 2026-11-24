'use client';
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { ChildContainerProps } from '@/types';
import { getErrorMessage } from '@/app/services/api-client';

interface ToastContextProps {
    showSuccess: (message: string) => void;
    showError: (error: unknown) => void;
}

const ToastContext = createContext({} as ToastContextProps);

export const ToastProvider = ({ children }: ChildContainerProps) => {
    const toast = useRef<Toast>(null);

    const showSuccess = useCallback((message: string) => toast.current?.show({ severity: 'success', summary: 'Success', detail: message, life: 3000 }), []);

    const showError = useCallback((error: unknown) => {
        const detail = typeof error === 'string' ? error : getErrorMessage(error);
        toast.current?.show({ severity: 'error', summary: 'Error', detail, life: 5000 });
    }, []);

    const value = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError]);

    return (
        <ToastContext.Provider value={value}>
            <Toast ref={toast} />
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
