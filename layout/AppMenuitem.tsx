'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { classNames } from 'primereact/utils';
import React, { useState } from 'react';
import { AppMenuItem, AppMenuItemProps } from '@/types';

const isActive = (item: AppMenuItem, pathname: string): boolean => (!!item.to && (pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to + '/')))) || !!item.items?.some((child) => isActive(child, pathname));

// Root items are always-expanded section titles; their children are links. A nested item with children is a
// submenu that opens on hover (or a click/tap, for touch screens) and stays open while one of its pages is shown.
const AppMenuitem = ({ item, root }: AppMenuItemProps) => {
    const pathname = usePathname();
    const [hovered, setHovered] = useState(false);
    const [toggled, setToggled] = useState(false);
    const isActiveRoute = !!item.to && isActive({ ...item, items: undefined }, pathname);
    const isSubmenu = !root && !!item.items;
    const open = isSubmenu && (hovered || toggled || isActive(item, pathname));

    return (
        <li className={classNames({ 'layout-root-menuitem': root, 'active-menuitem': open })} onMouseEnter={isSubmenu ? () => setHovered(true) : undefined} onMouseLeave={isSubmenu ? () => setHovered(false) : undefined}>
            {root && <div className="layout-menuitem-root-text">{item.label}</div>}

            {item.to && (
                <Link href={item.to} target={item.target} className={classNames({ 'active-route': isActiveRoute })} tabIndex={0}>
                    <i className={classNames('layout-menuitem-icon', item.icon)}></i>
                    <span className="layout-menuitem-text">{item.label}</span>
                </Link>
            )}

            {isSubmenu && !item.to && (
                <a role="button" tabIndex={0} aria-expanded={open} onClick={() => setToggled(!toggled)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setToggled(!toggled))}>
                    <i className={classNames('layout-menuitem-icon', item.icon)}></i>
                    <span className="layout-menuitem-text">{item.label}</span>
                    <i className="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                </a>
            )}

            {item.items && (
                <ul>
                    {item.items.map((child, i) => (
                        <AppMenuitem item={child} index={i} key={child.label} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default AppMenuitem;
