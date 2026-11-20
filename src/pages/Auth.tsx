import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Sparkles, TrendingUp } from 'lucide-react';
import type { FormEvent } from 'react';
import { request, errorMessage } from '../services/api';
import type { Notify } from '../types';
import { Logo } from '../components/Logo';
export function Auth({ onAuth, notify }: {
    onAuth: () => Promise<void>;
    notify: Notify;
}) { const [mode, setMode] = useState('login'), [loading, setLoading] = useState(false), [visible, setVisible] = useState(false); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget)); setLoading(true); try {
    await request('/auth/' + (mode === 'login' ? 'login' : 'register'), data);
    await onAuth();
}
catch (err) {
    notify(errorMessage(err), 'error');
}
finally {
    setLoading(false);
} } return <main className="auth-layout"><section className="auth-panel"><div className="auth-top"><Logo /></div><div className="auth-content"><span className="eyebrow">SEU ESPAÇO FINANCEIRO</span><h1>{mode === 'login' ? 'Bem-vindo de volta.' : 'Comece seu futuro financeiro.'}</h1><p className="muted">Organize suas finanças com simplicidade e um assistente que entende você.</p><form key={mode} onSubmit={submit} className="form-stack">{mode === 'register' && <label>Nome completo<input name="name" required minLength={2} autoComplete="name" placeholder="Como podemos chamar você?"/></label>}<label>E-mail<input name="email" type="email" autoComplete="email" required placeholder="seu@email.com"/></label><label>Senha<div className="password-field"><input name="password" required minLength={8} type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo de 8 caracteres"/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><button className="btn primary full" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'} <ArrowRight size={17}/></button></form><p className="auth-switch">{mode === 'login' ? 'Não tem uma conta?' : 'Já possui uma conta?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Criar conta grátis' : 'Entrar'}</button></p></div><small className="auth-foot">© Finanças AI • Controle pessoal e privacidade</small></section><section className="auth-aside"><div className="glow-circle"/><span className="hero-chip"><Sparkles size={16}/> Inteligência para o seu dia a dia</span><h2>Clareza para<br />cada decisão.<br /><em>Tranquilidade</em><br />para o futuro.</h2><p>Um lugar para organizar seu dinheiro, acompanhar suas metas e entender seus hábitos.</p><div className="auth-showcase"><div className="mini-head"><span>Resumo financeiro</span><TrendingUp size={18}/></div><div className="skeleton-line wide"/><div className="skeleton-line short"/><div className="mini-bars">{[28, 42, 38, 66, 54, 83, 72, 95].map((h, i) => <i key={i} style={{ height: `${h}%` }}/>)}</div><small>Você no controle, em cada etapa.</small></div></section></main>; }
