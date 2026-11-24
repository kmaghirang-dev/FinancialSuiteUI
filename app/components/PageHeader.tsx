import { ReactNode } from 'react';

interface Props {
    title: string;
    description?: string;
    icon?: string;
    actions?: ReactNode;
    children?: ReactNode;
}

const PageHeader = ({ title, description, icon, actions, children }: Props) => (
    <div className="page-header">
        {children}
        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
            <div className="flex align-items-center gap-3">
                {icon && (
                    <span className="page-header-icon">
                        <i className={icon} />
                    </span>
                )}
                <div>
                    <h2 className="m-0">{title}</h2>
                    {description && <p className="m-0 mt-1 text-color-secondary">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    </div>
);

export default PageHeader;
