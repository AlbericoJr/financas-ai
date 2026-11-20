import type { LucideIcon } from 'lucide-react';
export function IconButton({ icon: Icon, label, onClick, danger = false }: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) { return <button className={'icon-button ' + (danger ? 'danger-text' : '')} aria-label={label} title={label} onClick={onClick}><Icon size={17}/></button>; }
