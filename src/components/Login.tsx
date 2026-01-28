
import React, { useState } from 'react';
import { User } from '../types';
import { getUserByEmail, registerUser } from '../services/api';
import { LogIn, Loader2, UserPlus } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'owner' | 'renter' | 'partner'>('renter');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                const user = await getUserByEmail(email);
                if (user) {
                    onLogin(user);
                } else {
                    setError('Usuário não encontrado. Deseja criar uma conta?');
                }
            } else {
                const newUser = await registerUser(email, name, role);
                onLogin(newUser);
            }
        } catch (err) {
            setError('Erro no servidor. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-indigo-600 p-3 rounded-xl mb-4">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {mode === 'login' ? 'Bem-vindo ao VeloCity' : 'Criar minha conta'}
                    </h1>
                    <p className="text-slate-500">
                        {mode === 'login' ? 'Faça login para continuar' : 'Preencha os dados abaixo'}
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'login' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => { setMode('register'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'register' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                    >
                        Cadastrar
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ex: seu@email.com"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {mode === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Quero...</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'owner' | 'renter' | 'partner')}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="renter">Alugar Carros (Locatário)</option>
                                <option value="owner">Alugar meus Carros (Locador)</option>
                                <option value="partner">Oferecer Serviços (Mecânica/Seguro)</option>
                            </select>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Entrar' : 'Cadastrar e Entrar')}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            const password = window.prompt("Digite a senha de administrador:");
                            if (password === "admin@Jesus10") {
                                onLogin({
                                    id: 'admin_demo',
                                    name: 'Administrador VeloCity',
                                    email: 'admin@velocity.com',
                                    role: 'admin'
                                });
                            } else if (password) {
                                alert("Senha incorreta!");
                            }
                        }}
                        className="text-xs text-slate-400 hover:text-indigo-600 font-medium transition"
                    >
                        Acesso Administrativo
                    </button>
                </div>
            </div>
        </div>
    );
};
