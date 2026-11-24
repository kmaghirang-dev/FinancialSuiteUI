'use client';
import { PrimeReactProvider } from 'primereact/api';
import { LayoutProvider } from '../layout/context/layoutcontext';
import { ToastProvider } from '../layout/context/toastcontext';
import { ChildContainerProps } from '@/types';

const Providers = ({ children }: ChildContainerProps) => (
    <PrimeReactProvider>
        <LayoutProvider>
            <ToastProvider>{children}</ToastProvider>
        </LayoutProvider>
    </PrimeReactProvider>
);

export default Providers;
