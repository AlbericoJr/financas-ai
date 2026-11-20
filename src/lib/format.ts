export const money = (n: unknown) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dateBR = (s?: string | null) => s ? new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR') : '—';
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const monthNow = () => today().slice(0, 7);
export const cats = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Salário', 'Outras receitas', 'Outros gastos'];
export const COLORS = ['#1754a5', '#16865e', '#74b89b', '#196e83', '#6a9dc0', '#9bcab8', '#cbded6', '#ddb77e'];
