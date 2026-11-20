import { useState } from "react"
import { LogOut, ShieldCheck, Trash2 } from "lucide-react"
import type { FormEvent } from "react"
import type { User } from "../types"
import { Head } from "../components/Head"
export function Profile({
    user,
    onSave,
    onLogout,
    onDelete,
}: {
    user: User
    onSave: (d: Record<string, FormDataEntryValue>) => Promise<void>
    onLogout: () => void
    onDelete: () => void
}) {
    const [busy, setBusy] = useState(false)
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setBusy(true)
        try {
            await onSave(Object.fromEntries(new FormData(e.currentTarget)))
        } catch {
            /* erro exibido */
        } finally {
            setBusy(false)
        }
    }
    return (
        <>
            <Head
                eyebrow="SUA CONTA"
                title="Perfil e preferências"
                subtitle="Mantenha suas informações atualizadas."
            />
            <div className="profile-grid">
                <section className="card">
                    <div className="section-head">
                        <h2>Informações pessoais</h2>
                    </div>
                    <form className="form-stack" onSubmit={submit}>
                        <label>
                            Nome
                            <input
                                name="name"
                                required
                                minLength={2}
                                defaultValue={user.name}
                            />
                        </label>
                        <label>
                            E-mail
                            <input value={user.email} readOnly disabled />
                        </label>
                        <label>
                            Renda mensal aproximada (opcional)
                            <input
                                name="monthly_income"
                                type="number"
                                min="0"
                                max="100000000"
                                step="0.01"
                                defaultValue={user.profile?.monthly_income || 0}
                            />
                        </label>
                        <label>
                            Aparência
                            <select name="theme" defaultValue={user.profile?.theme || "auto"}>
                                <option value="auto">Automático</option>
                                <option value="light">Claro</option>
                                <option value="dark">Escuro</option>
                            </select>
                        </label>
                        <button className="btn primary" disabled={busy}>
                            Salvar alterações
                        </button>
                    </form>
                </section>
                <div className="profile-side">
                    <section className="card">
                        <ShieldCheck color="#1754a5" size={26} />
                        <h2>Privacidade</h2>
                        <p className="muted">
                            Seus registros financeiros são associados à sua conta e
                            armazenados no banco do servidor. Exclua sua conta para remover
                            seus dados.
                        </p>
                        <button className="btn secondary" onClick={onLogout}>
                            <LogOut size={16} /> Sair da conta
                        </button>
                        <button className="btn danger" onClick={onDelete}>
                            <Trash2 size={16} /> Excluir minha conta
                        </button>
                    </section>
                </div>
            </div>
        </>
    )
}
