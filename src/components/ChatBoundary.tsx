import React from 'react';
import type { ReactNode } from 'react';
export class ChatBoundary extends React.Component<{
    children: ReactNode;
    onBack: () => void;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <section className="card" role="alert"><h2>Não foi possível abrir o chat.</h2><p>Volte ao início e tente novamente. Se persistir, consulte o console do navegador.</p><button className="btn primary" onClick={this.props.onBack}>Voltar ao início</button></section> : this.props.children; }
}
