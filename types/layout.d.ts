import React, { Dispatch, SetStateAction, HTMLAttributeAnchorTarget } from 'react';

/* Context Types */
export type LayoutState = {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    profileSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
};

export type LayoutConfig = {
    ripple: boolean;
    inputStyle: string;
    menuMode: string;
};

export interface LayoutContextProps {
    layoutConfig: LayoutConfig;
    layoutState: LayoutState;
    setLayoutState: Dispatch<SetStateAction<LayoutState>>;
    onMenuToggle: () => void;
    showProfileSidebar: () => void;
}


/* AppTopbar Types */
export interface AppTopbarRef {
    menubutton?: HTMLButtonElement | null;
    topbarmenu?: HTMLDivElement | null;
    topbarmenubutton?: HTMLButtonElement | null;
}

/* AppMenu Types */
export interface AppMenuItem {
    label: string;
    icon?: string;
    to?: string;
    url?: string;
    target?: HTMLAttributeAnchorTarget;
    items?: AppMenuItem[];
}

export interface AppMenuItemProps {
    item: AppMenuItem;
    parentKey?: string;
    index: number;
    root?: boolean;
}
