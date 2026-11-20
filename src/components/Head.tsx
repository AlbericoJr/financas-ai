import type { ReactNode } from 'react';
export function Head({ eyebrow, title, subtitle, action }: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    action?: ReactNode;
}) { return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{action}</div>; }
