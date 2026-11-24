import React from 'react';
import AppMenuitem from './AppMenuitem';
import { AppMenuItem } from '@/types';

// One section per FinancialSuite API module.
const model: AppMenuItem[] = [
    {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Credit Card Tracker',
        items: [
            {
                label: 'Reports',
                icon: 'pi pi-fw pi-chart-bar',
                items: [
                    { label: 'Overview', icon: 'pi pi-fw pi-chart-pie', to: '/credit-card-overview' },
                    { label: 'Monthly Analysis', icon: 'pi pi-fw pi-chart-bar', to: '/credit-card-analysis' }
                ]
            },
            // Each card's page holds its statement history and payments.
            { label: 'My Credit Cards', icon: 'pi pi-fw pi-credit-card', to: '/credit-cards' }
        ]
    },
    {
        label: 'Administration',
        items: [
            { label: 'Dropdown Lists', icon: 'pi pi-fw pi-list', to: '/dropdowns' },
            { label: 'User Roles', icon: 'pi pi-fw pi-users', to: '/user-roles' }
        ]
    },
    {
        label: 'Account',
        items: [{ label: 'My Profile', icon: 'pi pi-fw pi-id-card', to: '/profile' }]
    }
];

const AppMenu = () => (
    <ul className="layout-menu">
        {model.map((item, i) => (
            <AppMenuitem item={item} root={true} index={i} key={item.label} />
        ))}
    </ul>
);

export default AppMenu;
