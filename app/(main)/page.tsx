'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/app/components/PageHeader';
import DebtSummaryCards from '@/app/components/credit-card/DebtSummaryCards';
import { formatPeso } from '@/app/components/credit-card/format';
import { CreditCardOverview, creditCardService } from '@/app/services/credit-card.service';
import { dropDownCategoryService } from '@/app/services/dropdown.service';
import { PagedQuery, PagedResult } from '@/app/services/http-service';
import { getCurrentUserEmail } from '@/app/services/auth-session';

interface StatDefinition {
    label: string;
    icon: string;
    to: string;
    load: (query: PagedQuery) => Promise<PagedResult<unknown>>;
}

const stats: StatDefinition[] = [
    { label: 'Credit cards', icon: 'pi pi-credit-card', to: '/credit-cards', load: creditCardService.getPaginated },
    { label: 'Dropdown lists', icon: 'pi pi-list', to: '/dropdowns', load: dropDownCategoryService.getPaginated }
];

const firstPage: PagedQuery = { pageNumber: 1, pageSize: 5 };

const StatCard = ({ stat }: { stat: StatDefinition }) => {
    const [total, setTotal] = useState<number | null>(null);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        stat.load(firstPage)
            .then((result) => setTotal(result.totalCount))
            .catch(() => setUnavailable(true));
    }, [stat]);

    return (
        <Link href={stat.to} className="card stat-card">
            <div>
                <div className="text-color-secondary mb-2">{stat.label}</div>
                <div className="stat-value">{unavailable ? '—' : total ?? '…'}</div>
                {unavailable && <small className="text-color-secondary">Not available for your role</small>}
            </div>
            <span className="stat-icon">
                <i className={stat.icon} />
            </span>
        </Link>
    );
};

const Dashboard = () => {
    // All-time credit card overview; null while loading, undefined if it failed.
    const [overview, setOverview] = useState<CreditCardOverview | null | undefined>(null);

    useEffect(() => {
        creditCardService
            .getOverview({})
            .then(setOverview)
            .catch(() => setOverview(undefined));
    }, []);

    // Cards with the most debt first.
    const cards = [...(overview?.cards ?? [])].sort((a, b) => b.currentOutstanding - a.currentOutstanding).slice(0, 5);

    return (
        <>
            <PageHeader title="Dashboard" description={`Welcome back, ${getCurrentUserEmail()}.`} icon="pi pi-home" />

            {overview && overview.cards.length > 0 && <DebtSummaryCards summary={overview.summary} rangeLabel="All time" />}

            <div className="grid mt-2">
                {stats.map((stat) => (
                    <div key={stat.label} className="col-12 sm:col-6">
                        <StatCard stat={stat} />
                    </div>
                ))}
            </div>

            <div className="grid mt-2">
                <div className="col-12">
                    <div className="card">
                        <div className="flex justify-content-between align-items-center mb-3">
                            <h5 className="m-0">Credit card balances</h5>
                            <Link href="/credit-card-overview">Open overview</Link>
                        </div>
                        {overview === null ? (
                            <p className="text-color-secondary m-0">Loading…</p>
                        ) : cards.length === 0 ? (
                            <p className="text-color-secondary m-0">
                                {overview === undefined ? 'Credit card data is not available right now.' : 'No credit cards yet.'} <Link href="/credit-cards">Add a card</Link>
                            </p>
                        ) : (
                            <ul className="list-none p-0 m-0">
                                {cards.map((card) => (
                                    <li key={card.creditCardId} className="flex justify-content-between align-items-center gap-3 py-2 border-bottom-1 surface-border">
                                        <Link href={`/credit-cards/${card.creditCardId}`} className="overflow-hidden text-overflow-ellipsis white-space-nowrap">
                                            {card.displayName}
                                        </Link>
                                        <span className="text-right">
                                            <span className="font-semibold">{formatPeso(card.currentOutstanding)}</span>
                                            {card.creditLimit !== null && <small className="block text-color-secondary">{formatPeso(card.availableCredit)} available</small>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
