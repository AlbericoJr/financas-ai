import { useState } from 'react';
import type { FormEvent } from 'react';
import { today, cats } from '../lib/format';
import type { TxInput } from '../types';
export function TransactionForm({ initial, onSave, onClose }: {
    initial?: TxInput;
    onSave: (d: TxInput) => Promise<void>;
    onClose: () => void;
}) { const [busy, setBusy] = useState(false); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); try {
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await onSave({ type: data.type === 'income' ? 'income' : 'expense', amount: Number(data.amount), description: String(data.description), category: String(data.category), date: String(data.date) });
    onClose();
}
catch { /* erro exibido no aplicativo */ }
finally {
    setBusy(false);
} } return <form className="form-stack" onSubmit={submit}><div className="form-grid"><label>Tipo<select name="type" defaultValue={initial?.type || 'expense'}><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Valor (R$)<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required defaultValue={initial?.amount || ''} placeholder="0,00"/></label><label className="span2">Descrição<input name="description" required maxLength={180} defaultValue={initial?.description || ''} placeholder="Ex.: Mercado do bairro"/></label><label>Categoria<select name="category" defaultValue={initial?.category || 'Alimentação'}>{cats.map(c => <option key={c}>{c}</option>)}</select></label><label>Data<input name="date" type="date" required defaultValue={initial?.date || today()}/></label></div><footer className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar transação'}</button></footer></form>; }
