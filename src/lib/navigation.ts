import { LayoutDashboard, MessageCircle, Target, WalletCards, ChartNoAxesCombined } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Page } from '../types';
export const nav: [
    Page,
    string,
    LucideIcon
][] = [['home', 'Início', LayoutDashboard], ['chat', 'Assistente', MessageCircle], ['transactions', 'Transações', WalletCards], ['goals', 'Metas', Target], ['reports', 'Relatórios', ChartNoAxesCombined]];
