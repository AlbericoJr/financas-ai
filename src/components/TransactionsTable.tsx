import { ArrowDownLeft, ArrowUpRight, Edit3, Trash2, WalletCards } from 'lucide-react';
import { money, dateBR } from '../lib/format';
import type { Tx } from '../types';
import { IconButton } from '../components/IconButton';
import { Empty } from '../components/Empty';
export function TransactionsTable({ items, onEdit, onDelete, compact = false }: {
    items: Tx[];
    onEdit?: (t: Tx) => void;
    onDelete?: (t: Tx) => void;
    compact?: boolean;
}) { if (!items?.length)
    return <Empty icon={WalletCards} title="Sem movimentações" text="Adicione sua primeira receita ou despesa para começar."/>; return <div className="table-scroll"><table><thead><tr><th>Movimentação</th><th>Data</th><th>Categoria</th><th className="right">Valor</th>{!compact && <th className="right">Ações</th>}</tr></thead><tbody>{items.map(t => <tr key={t.id}><td><div className="transaction-label"><span className={'tx-icon ' + (t.type === 'income' ? 'income' : 'expense')}>{t.type === 'income' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span><div><strong>{t.description}</strong><small>{t.source === 'chat' ? 'Via chat IA' : 'Manual'}</small></div></div></td><td>{dateBR(t.date)}</td><td><span className="category-pill">{t.category}</span></td><td className={'right amount ' + (t.type === 'income' ? 'positive' : 'negative')}>{t.type === 'income' ? '+' : '−'} {money(t.amount)}</td>{!compact && <td className="right actions"><IconButton icon={Edit3} label="Editar" onClick={() => onEdit?.(t)}/><IconButton icon={Trash2} label="Excluir" danger onClick={() => onDelete?.(t)}/></td>}</tr>)}</tbody></table></div>; }
