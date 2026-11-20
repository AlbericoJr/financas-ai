import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GoalInput } from '../types';
export function GoalForm({ initial, onSave, onClose }: {
    initial?: GoalInput;
    onSave: (d: GoalInput) => Promise<void>;
    onClose: () => void;
}) { const [busy, setBusy] = useState(false); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); try {
    const f = new FormData(e.currentTarget);
    await onSave({ name: String(f.get('name')), target: Number(f.get('target')), deadline: String(f.get('deadline') || '') || null });
    onClose();
}
catch { /* erro exibido no aplicativo */ }
finally {
    setBusy(false);
} } return <form className="form-stack" onSubmit={submit}><label>Nome da meta<input name="name" required maxLength={100} defaultValue={initial?.name || ''} placeholder="Ex.: Viagem dos sonhos"/></label><div className="form-grid"><label>Valor desejado (R$)<input name="target" required type="number" min="0.01" step="0.01" defaultValue={initial?.target || ''}/></label><label>Prazo (opcional)<input name="deadline" type="date" defaultValue={initial?.deadline || ''}/></label></div><footer className="form-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={busy}>Salvar meta</button></footer></form>; }
