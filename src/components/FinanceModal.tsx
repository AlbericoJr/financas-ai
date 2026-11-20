import type { FormEvent } from 'react';
import type { Goal, GoalInput, ModalState, TxInput } from '../types';
import { Modal } from './Modal';
import { TransactionForm } from './TransactionForm';
import { GoalForm } from './GoalForm';
import { useState } from 'react';
export function FinanceModal({ modal, close, saveTx, saveGoal, contribute }: {
    modal: ModalState;
    close: () => void;
    saveTx: (x: TxInput) => Promise<void>;
    saveGoal: (x: GoalInput) => Promise<void>;
    contribute: (goal: Goal, amount: number) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (modal.type !== 'contribute')
            return;
        const amount = Number(new FormData(e.currentTarget).get('amount'));
        setBusy(true);
        try {
            await contribute(modal.data, amount);
            close();
        }
        catch { /* notified by controller */ }
        finally {
            setBusy(false);
        }
    }
    const title = modal.type === 'transaction' ? (modal.data ? 'Editar transação' : 'Nova transação') : modal.type === 'chatEdit' ? 'Corrigir lançamento do chat' : modal.type === 'goal' ? (modal.data ? 'Editar meta' : 'Nova meta') : 'Adicionar valor à meta';
    return <Modal title={title} onClose={close}>
    {(modal.type === 'transaction' || modal.type === 'chatEdit') && <TransactionForm initial={modal.data} onSave={saveTx} onClose={close}/>}
    {modal.type === 'goal' && <GoalForm initial={modal.data} onSave={saveGoal} onClose={close}/>}
    {modal.type === 'contribute' && <form className="form-stack" onSubmit={submit}>
      <p className="muted">Meta: <strong>{modal.data.name}</strong></p>
      <label>Valor reservado (R$)<input name="amount" type="number" min="0.01" step="0.01" required autoFocus/></label>
      <p className="muted tiny">Esta operação não realiza transferências bancárias.</p>
      <footer className="form-actions"><button type="button" className="btn secondary" onClick={close}>Cancelar</button><button className="btn primary" disabled={busy}>{busy ? 'Salvando...' : 'Adicionar'}</button></footer>
    </form>}
  </Modal>;
}
