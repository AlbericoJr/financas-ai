import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../components/IconButton';
export function Modal({ title, children, onClose }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) { useEffect(() => { const fn = (e: KeyboardEvent) => { if (e.key === 'Escape')
    onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]); return <div className="modal-shade" onMouseDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-top"><h2>{title}</h2><IconButton icon={X} label="Fechar" onClick={onClose}/></div>{children}</section></div>; }
