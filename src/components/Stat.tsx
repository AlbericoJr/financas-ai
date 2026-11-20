import type { LucideIcon } from 'lucide-react';
import { money } from '../lib/format';
export function Stat({ title, value, icon: Icon, tone = 'green', hint }: {
    title: string;
    value?: number;
    icon: LucideIcon;
    tone?: string;
    hint?: string;
}) { return <article className="stat card"><div className={'stat-icon ' + tone}><Icon size={20}/></div><p>{title}</p><strong>{title.includes("Transações") || title.includes("registros") ? Number(value || 0).toLocaleString("pt-BR") : money(value)}</strong><small>{hint}</small></article>; }
