import { Metadata } from 'next';
import 'primereact/resources/primereact.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import '../styles/layout/layout.scss';
import Providers from './providers';

interface RootLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: 'FinancialSuite',
    description: 'Personal finance dashboard for the FinancialSuite API.',
    robots: { index: false, follow: false },
    viewport: { initialScale: 1, width: 'device-width' },
};

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link id="theme-css" href="/themes/financial-navy/theme.css" rel="stylesheet"></link>
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
