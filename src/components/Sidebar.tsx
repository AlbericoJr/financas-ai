import { ArrowRight, MoreHorizontal, Sparkles, X } from 'lucide-react';
import type { Page, User } from '../types';
import { Logo } from './Logo';
import { nav } from '../lib/navigation';
export function Sidebar({ user, page, setPage, mobileMenu, setMobileMenu }: {
    user: User;
    page: Page;
    setPage: (p: Page) => void;
    mobileMenu: boolean;
    setMobileMenu: (v: boolean) => void;
}) { return <aside className={'sidebar ' + (mobileMenu ? 'open' : '')}><div className="side-brand"><Logo /><button className="mobile-close" onClick={() => setMobileMenu(false)}><X size={20}/></button></div><p className="side-caption">MENU PRINCIPAL</p><nav aria-label="Menu principal">{nav.map(([id, name, Icon]) => <button className={'nav-item ' + (page === id ? 'active' : '')} key={id} onClick={() => { setPage(id); setMobileMenu(false); }}><Icon size={19}/><span>{name}</span>{page === id && <span className="active-bar"/>}</button>)}</nav><div className="side-bottom"><div className="side-help"><Sparkles size={18}/><strong>Dica rápida</strong><small>Registre suas despesas pelo Chat IA em segundos.</small><button onClick={() => setPage('chat')}>Abrir chat <ArrowRight size={14}/></button></div><button className="side-user" onClick={() => setPage('profile')}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>Minha conta</small></span><MoreHorizontal size={18}/></button></div></aside>; }
