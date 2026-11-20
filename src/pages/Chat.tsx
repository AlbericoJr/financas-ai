import { useEffect, useRef, useState } from "react"
import {
    ArrowRight,
    Bot,
    Check,
    CheckCircle2,
    Send,
    ShieldCheck,
    Sparkles,
} from "lucide-react"
import type { FormEvent } from "react"
import { money } from "../lib/format"
import type { Message, Pending } from "../types"
import { Head } from "../components/Head"
export function Chat({
    messages,
    action,
    onSend,
    onConfirm,
    onCancel,
    onEdit,
    sending,
}: {
    messages: Message[]
    action: Pending | null
    onSend: (m: string, r: () => void) => Promise<void>
    onConfirm: () => void
    onCancel: () => void
    onEdit: () => void
    sending: boolean
}) {
    const [text, setText] = useState("")
    const bottom = useRef<HTMLDivElement>(null)
    useEffect(() => {
        bottom.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" })
    }, [messages, action])
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!text.trim() || sending) return
        const val = text
        setText("")
        await onSend(val, () => setText(val))
    }
    return (
        <>
            <Head
                eyebrow="ASSISTENTE FINANCEIRO"
                title="Chat financeiro"
                subtitle="Converse naturalmente sobre seus registros financeiros."
            />
            <div className="chat-layout">
                <section className="card chat-main">
                    <div className="chat-header">
                        <span className="bot-avatar">
                            <Bot size={22} />
                        </span>
                        <div>
                            <strong>Assistente Finanças AI</strong>
                            <small>
                                <span className="status-dot" /> Assistente financeiro
                            </small>
                        </div>
                        <span className="secure">
                            <ShieldCheck size={15} /> Confirme seus lançamentos
                        </span>
                    </div>
                    <div className="chat-messages">
                        {!messages.length && (
                            <div className="chat-welcome">
                                <div className="bot-big">
                                    <Bot size={29} />
                                </div>
                                <h2>Olá! Como posso ajudar?</h2>
                                <p>
                                    Registre seus gastos ou consulte seus resultados. Os registros ficam neste navegador. Não compartilhe senhas ou dados bancários.
                                </p>
                                <div className="suggestions">
                                    {[
                                        "Gastei 35 reais no almoço hoje",
                                        "Quanto gastei este mês?",
                                        "Qual é meu saldo?",
                                        "Me dê uma dica para economizar",
                                    ].map((q) => (
                                        <button onClick={() => setText(q)} key={q}>
                                            {q}
                                            <ArrowRight size={14} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {(Array.isArray(messages) ? messages : [])
                            .filter((m) => m && typeof m.content === "string")
                            .map((m, i) => (
                                <div
                                    className={
                                        "chat-message " + (m.role === "user" ? "mine" : "theirs")
                                    }
                                    key={m.id || i}
                                >
                                    {m.role !== "user" && (
                                        <span className="mini-bot">
                                            <Bot size={17} />
                                        </span>
                                    )}
                                    <div className="bubble">{m.content}</div>
                                </div>
                            ))}
                        {action && (
                            <div className="confirmation">
                                <strong>
                                    <CheckCircle2 size={18} /> Confirmação necessária
                                </strong>
                                <p>
                                    {action.action.type === "income" ? "Receita" : "Despesa"} de{" "}
                                    {money(action.action.amount)} — {action.action.category}.
                                    Deseja registrar?
                                </p>
                                <div className="button-row">
                                    <button
                                        className="btn primary small"
                                        disabled={sending}
                                        onClick={onConfirm}
                                    >
                                        <Check size={15} /> Confirmar
                                    </button>
                                    <button
                                        className="btn secondary small"
                                        disabled={sending}
                                        onClick={onEdit}
                                    >
                                        Corrigir
                                    </button>
                                    <button
                                        className="btn secondary small"
                                        disabled={sending}
                                        onClick={onCancel}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                        <div ref={bottom} />
                    </div>
                    <form className="chat-entry" onSubmit={submit}>
                        <input
                            aria-label="Mensagem financeira"
                            maxLength={500}
                            placeholder="Ex.: Gastei R$ 45 de transporte hoje..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <button
                            className="send-button"
                            disabled={sending || Boolean(action) || !text.trim()}
                            aria-label="Enviar mensagem"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </section>
                <aside className="chat-side">
                    <div className="card">
                        <Sparkles color="#1754a5" size={24} />
                        <h3>Como funciona?</h3>
                        <p>
                            O assistente local interpreta lançamentos e consulta seus registros. Você confirma
                            antes de qualquer transação ser salva.
                        </p>
                    </div>
                </aside>
            </div>
        </>
    )
}
