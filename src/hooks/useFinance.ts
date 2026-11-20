import { useEffect, useRef, useState } from 'react';
import { api, request, errorMessage } from '../services/api';
import type { Goal, GoalInput, Message, ModalState, Notify, Page, Pending, Report, Summary, Tx, TxInput } from '../types';
export function useFinance() {
    const [page, setPage] = useState<Page>('home');
    const [dashboard, setDashboard] = useState<Summary | null>(null);
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [reports, setReports] = useState<Report | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [pending, setPending] = useState<Pending | null>(null);
    const [modal, setModal] = useState<ModalState | null>(null);
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState<{
        msg: string;
        type: 'success' | 'error';
    } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlight = useRef(false);
    const notify: Notify = (msg, type = 'success') => {
        if (timer.current)
            clearTimeout(timer.current);
        setNotice({ msg, type });
        timer.current = setTimeout(() => setNotice(null), 4500);
    };
    useEffect(() => () => { if (timer.current)
        clearTimeout(timer.current); }, []);
    async function loadData() {
        const [d, t, g, r, c] = await Promise.all([
            api<Summary>('/dashboard'), api<Tx[]>('/transactions'), api<Goal[]>('/goals'),
            api<Report>('/reports'), api<Message[]>('/chat')
        ]);
        setDashboard(d);
        setTransactions(t);
        setGoals(g);
        setReports(r);
        setMessages(Array.isArray(c) ? c : []);
        setPending(await api<Pending | null>('/pending'));
        setLoadError('');
    }
    async function refresh() {
        try {
            await loadData();
        }
        catch (e) {
            setLoadError(errorMessage(e));
        }
    }
    useEffect(() => { void refresh(); }, []);
    useEffect(() => {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => { document.documentElement.dataset.theme = query.matches ? 'dark' : 'light'; };
        apply();
        query.addEventListener('change', apply);
        return () => query.removeEventListener('change', apply);
    }, []);
    async function mutate(fn: () => Promise<void>, message?: string, reload = true) {
        if (inFlight.current)
            throw new Error('Aguarde a operação atual.');
        inFlight.current = true;
        setBusy(true);
        try {
            await fn();
            if (message)
                notify(message);
            if (reload)
                await refresh();
        }
        catch (e) {
            notify(errorMessage(e), 'error');
            throw e;
        }
        finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    async function saveTx(data: TxInput) {
        await mutate(async () => {
            if (modal?.type === 'chatEdit') {
                if (!pending)
                    throw new Error('Lançamento não disponível.');
                await request('/chat/confirm/' + pending.actionId, data);
                setPending(null);
            }
            else if (modal?.type === 'transaction' && modal.data?.id) {
                await request('/transactions/' + modal.data.id, data, 'PATCH');
            }
            else {
                await request('/transactions', data);
            }
        }, 'Transação salva com sucesso!');
    }
    async function saveGoal(data: GoalInput) {
        const id = modal?.type === 'goal' ? modal.data?.id : undefined;
        await mutate(async () => { await request('/goals' + (id ? '/' + id : ''), data, id ? 'PATCH' : 'POST'); }, 'Meta salva com sucesso!');
    }
    async function contribute(goal: Goal, amount: number) {
        await mutate(async () => { await request('/goals/' + goal.id + '/contributions', { amount }); }, 'Valor adicionado à meta.');
    }
    async function delTx(t: Tx) {
        if (window.confirm('Excluir esta transação?'))
            await mutate(async () => { await api('/transactions/' + t.id, { method: 'DELETE' }); }, 'Transação excluída.').catch(() => { });
    }
    async function delGoal(g: Goal) {
        if (window.confirm('Excluir esta meta e suas contribuições?'))
            await mutate(async () => { await api('/goals/' + g.id, { method: 'DELETE' }); }, 'Meta excluída.').catch(() => { });
    }
    async function sendChat(message: string, rollback: () => void) {
        if (pending || inFlight.current) {
            notify('Conclua o lançamento pendente antes de enviar outra mensagem.', 'error');
            rollback();
            return;
        }
        inFlight.current = true;
        setBusy(true);
        try {
            const response = await request<{
                reply: string;
                actionId: string | null;
                action: TxInput | null;
            }>('/chat', { message });
            setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: response.reply }]);
            if (response.actionId && response.action)
                setPending({ actionId: response.actionId, action: response.action });
        }
        catch (e) {
            notify(errorMessage(e), 'error');
            rollback();
        }
        finally {
            inFlight.current = false;
            setBusy(false);
        }
    }
    async function confirmChat() {
        if (!pending)
            return;
        const id = pending.actionId;
        await mutate(async () => { await request('/chat/confirm/' + id, {}); setPending(null); }, 'Lançamento confirmado!').catch(() => { });
    }
    async function cancelChat() {
        if (!pending)
            return;
        const id = pending.actionId;
        await mutate(async () => { await request('/chat/cancel/' + id, {}); setPending(null); }, 'Lançamento cancelado.').catch(() => { });
    }
    return { page, setPage, dashboard, transactions, goals, reports, messages, pending, modal, setModal, busy, notice, notify, loadError, refresh, saveTx, saveGoal, contribute, delTx, delGoal, sendChat, confirmChat, cancelChat };
}
