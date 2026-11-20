import { Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
export function Empty({ icon: Icon = Wallet, title = 'Nada por aqui ainda', text, action }: {
    icon?: LucideIcon;
    title?: string;
    text: string;
    action?: ReactNode;
}) { return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><strong>{title}</strong><p>{text}</p>{action}</div>; }
