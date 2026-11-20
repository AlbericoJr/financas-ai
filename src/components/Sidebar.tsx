import { ArrowRight, Sparkles, X } from 'lucide-react';
import type { Page } from '../types';
import { Logo } from './Logo';
import { nav } from '../lib/navigation';
export function Sidebar({ page, setPage, mobileMenu, setMobileMenu }: {
    page: Page;
    setPage: (p: Page) => void;
    mobileMenu: boolean;
    setMobileMenu: (v: boolean) => void;
}) { return <aside className={'sidebar ' + (mobileMenu ? 'open' : '')}><div className="side-brand"><Logo /><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={20}/></button></div><p className="side-caption">MENU PRINCIPAL</p><nav aria-label="Menu principal">{nav.map(([id, name, Icon]) => <button className={'nav-item ' + (page === id ? 'active' : '')} key={id} onClick={() => { setPage(id); setMobileMenu(false); }}><Icon size={19}/><span>{name}</span>{page === id && <span className="active-bar"/>}</button>)}</nav><div className="side-bottom"><div className="side-help"><Sparkles size={18}/><strong>Dica rápida</strong><small>Registre suas despesas pelo assistente em segundos.</small><button onClick={() => setPage('chat')}>Abrir chat <ArrowRight size={14}/></button></div><small className="muted">Dados neste navegador</small></div></aside>; }
