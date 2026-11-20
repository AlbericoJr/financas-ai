import { Edit3, Flag, Plus, Target, Trash2 } from 'lucide-react';
import { money, dateBR, COLORS } from '../lib/format';
import type { Goal } from '../types';
import { IconButton } from '../components/IconButton';
import { Empty } from '../components/Empty';
import { Head } from '../components/Head';
export function Goals({ goals, onNew, onEdit, onDelete, onContribute }: {
    goals: Goal[];
    onNew: () => void;
    onEdit: (g: Goal) => void;
    onDelete: (g: Goal) => void;
    onContribute: (g: Goal) => void;
}) { return <><Head eyebrow="SEUS PLANOS" title="Metas financeiras" subtitle="Transforme seus objetivos em conquistas." action={<button className="btn primary" onClick={onNew}><Plus size={17}/> Criar meta</button>}/>{!goals.length ? <section className="card"><Empty icon={Target} title="Sua primeira meta começa aqui" text="Guarde dinheiro para uma viagem, uma reserva ou qualquer objetivo importante." action={<button className="btn primary" onClick={onNew}><Plus size={16}/> Criar minha primeira meta</button>}/></section> : <div className="goals-grid">{goals.map((g, i) => { const pct = Math.min(100, Math.round((g.saved / g.target) * 100)); return <article className="card goal-card" key={g.id}><div className="goal-top"><div className="goal-symbol" style={{ background: COLORS[i % COLORS.length] + '22', color: COLORS[i % COLORS.length] }}><Flag size={22}/></div><div className="goal-options"><IconButton icon={Edit3} label="Editar meta" onClick={() => onEdit(g)}/><IconButton icon={Trash2} label="Excluir meta" danger onClick={() => onDelete(g)}/></div></div><h2>{g.name}</h2><p className="muted">{g.deadline ? `Prazo: ${dateBR(g.deadline)}` : 'Sem prazo definido'}</p><div className="goal-values"><strong>{money(g.saved)}</strong><span>de {money(g.target)}</span></div><div className="progress-line"><i style={{ width: pct + '%', background: COLORS[i % COLORS.length] }}/></div><div className="goal-bottom"><span>{pct}% alcançado</span><button className="btn secondary small" onClick={() => onContribute(g)}><Plus size={15}/> Adicionar valor</button></div></article>; })}</div>}</>; }
