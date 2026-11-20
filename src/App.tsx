import { useState } from 'react';
import { useFinance } from './hooks/useFinance';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './layout/Topbar';
import { FinanceModal } from './components/FinanceModal';
import { ChatBoundary } from './components/ChatBoundary';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Chat } from './pages/Chat';
export default function App() {
    const f = useFinance();
    const [mobileMenu, setMobileMenu] = useState(false);
    const toast = f.notice && <div role="alert" className={'toast ' + f.notice.type}>{f.notice.msg}</div>;
    return <div className="app-shell">
    <Sidebar page={f.page} setPage={f.setPage} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu}/>
    <main className="main">
      <Topbar page={f.page} openMenu={() => setMobileMenu(true)}/>
      <div className="page">
        {f.loadError && <div className="load-error" role="alert"><span>Não foi possível atualizar os dados. {f.loadError}</span><button className="btn secondary small" onClick={() => void f.refresh()}>Tentar novamente</button></div>}
        {f.page === 'home' && <Dashboard data={f.dashboard} transactions={f.transactions} goals={f.goals} setPage={f.setPage} onNew={() => f.setModal({ type: 'transaction' })}/>}
        {f.page === 'transactions' && <Transactions items={f.transactions} onNew={() => f.setModal({ type: 'transaction' })} onEdit={data => f.setModal({ type: 'transaction', data })} onDelete={f.delTx}/>}
        {f.page === 'goals' && <Goals goals={f.goals} onNew={() => f.setModal({ type: 'goal' })} onEdit={data => f.setModal({ type: 'goal', data })} onDelete={f.delGoal} onContribute={data => f.setModal({ type: 'contribute', data })}/>}
        {f.page === 'reports' && <Reports reports={f.reports} data={f.dashboard} items={f.transactions}/>}
        {f.page === 'chat' && <ChatBoundary onBack={() => f.setPage('home')}><Chat messages={f.messages} action={f.pending} onSend={f.sendChat} onConfirm={f.confirmChat} onCancel={f.cancelChat} onEdit={() => f.pending && f.setModal({ type: 'chatEdit', data: f.pending.action })} sending={f.busy}/></ChatBoundary>}
      </div>
    </main>
    {mobileMenu && <div className="mobile-overlay" onClick={() => setMobileMenu(false)}/>}
    {f.modal && <FinanceModal modal={f.modal} close={() => f.setModal(null)} saveTx={f.saveTx} saveGoal={f.saveGoal} contribute={f.contribute}/>}
    {toast}
  </div>;
}
