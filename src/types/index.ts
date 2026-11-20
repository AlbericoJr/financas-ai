export type Page = 'home' | 'chat' | 'transactions' | 'goals' | 'reports' | 'profile';
export type TxInput = {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    date: string;
};
export type Tx = TxInput & {
    id: string;
    source: string;
};
export type GoalInput = {
    name: string;
    target: number;
    deadline: string | null;
};
export type Goal = GoalInput & {
    id: string;
    saved: number;
};
export type Summary = {
    income: number;
    expenses: number;
    balance: number;
    available: number;
    count: number;
    categories: {
        name: string;
        value: number;
    }[];
};
export type Report = {
    months: (Summary & {
        month: string;
    })[];
};
export type Message = {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
};
export type Pending = {
    actionId: string;
    action: TxInput;
};
export type User = {
    id: string;
    name: string;
    email: string;
    profile: {
        theme: 'light' | 'dark' | 'auto';
        monthly_income: number;
        onboarded: boolean;
    };
};
export type Notify = (msg: string, type?: 'success' | 'error') => void;
export type ModalState = {
    type: 'transaction';
    data?: Tx;
} | {
    type: 'chatEdit';
    data: TxInput;
} | {
    type: 'goal';
    data?: Goal;
} | {
    type: 'contribute';
    data: Goal;
};
