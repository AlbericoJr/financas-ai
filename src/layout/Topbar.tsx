import { CalendarDays, ChevronRight, Menu } from 'lucide-react';
import type { Page } from '../types';
import { nav } from '../lib/navigation';
export function Topbar({ page, openMenu }: {
    page: Page;
    openMenu: () => void;
}) {
    const current = nav.find(n => n[0] === page) || nav[0];
    return <header className="topbar">
    <div className="top-left"><button className="menu-trigger" aria-label="Abrir menu" onClick={openMenu}><Menu size={22}/></button><span>Meu espaço <ChevronRight size={15}/> <b>{current[1]}</b></span></div>
    <div className="top-right"><span className="top-date"><CalendarDays size={16}/> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
  </header>;
}
