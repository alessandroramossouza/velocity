import React, { useState } from 'react';
import { User } from '../types';
import { getUserByEmail, registerUser } from '../services/api';
import { LogIn, Loader2, UserPlus, Upload, ShieldCheck, MapPin, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAddressByCep } from '../utils/AddressAutocomplete';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'owner' | 'renter' | 'partner'>('renter');

    // Register Data
    const [cpf, setCpf] = useState('');
    const [rg, setRg] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // Files
    const [cpfFile, setCpfFile] = useState<File | null>(null);
    const [residenceFile, setResidenceFile] = useState<File | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await getUserByEmail(email);
            if (user) {
                onLogin(user);
            } else {
                setError('Usuário não encontrado. Deseja criar uma conta?');
            }
        } catch (err) {
            setError('Erro ao entrar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCepBlur = async () => {
        if (cep.length >= 8) {
            setLoading(true);
            const data = await fetchAddressByCep(cep);
            setLoading(false);
            if (data) {
                setAddress(data.logradouro);
                setNeighborhood(data.neighborhood);
                setCity(data.city);
                setState(data.state);
            }
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!name || !email || !cpf || !cep || !address || !number) {
            setError('Por favor, preencha todos os campos obrigatórios (*)');
            setLoading(false);
            return;
        }

        try {
            let cpfUrl = '';
            let proofResidenceUrl = '';

            // Upload Files
            if (cpfFile) {
                const fileName = `cpf_${Date.now()}_${cpfFile.name}`;
                const { data, error: upErr } = await supabase.storage.from('user-documents').upload(fileName, cpfFile);
                if (!upErr && data) {
                    const { data: publicUrl } = supabase.storage.from('user-documents').getPublicUrl(fileName);
                    cpfUrl = publicUrl.publicUrl;
                }
            }

            if (residenceFile) {
                const fileName = `res_${Date.now()}_${residenceFile.name}`;
                const { data, error: upErr } = await supabase.storage.from('user-documents').upload(fileName, residenceFile);
                if (!upErr && data) {
                    const { data: publicUrl } = supabase.storage.from('user-documents').getPublicUrl(fileName);
                    proofResidenceUrl = publicUrl.publicUrl;
                }
            }

            const extendedData = {
                cpf, rg, cep, address, number, complement, neighborhood, city, state,
                cpfUrl, proofResidenceUrl
            };

            const newUser = await registerUser(email, name, role, extendedData);
            onLogin(newUser);

        } catch (err: any) {
            console.error(err);
            setError('Erro ao cadastrar: ' + (err.message || 'Erro desconhecido. Verifique se executou o script SQL.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 py-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in relative overflow-hidden">
                {/* Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-xl mb-4">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {mode === 'login' ? 'Bem-vindo de volta' : 'Criar Conta'}
                    </h1>
                    <div className="flex bg-slate-100 p-1 rounded-lg mt-4 w-full">
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
                </div>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4 text-center animate-shake border border-red-100">
                        {error}
                    </div>
                )}

                {/* LOGIN FORM */}
                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                        </button>

                        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    const password = window.prompt("Senha Admin:");
                                    if (password === "admin@Jesus10") {
                                        onLogin({ id: 'admin', name: 'Admin', email: 'admin@velocity.com', role: 'admin' });
                                    }
                                }}
                                className="text-xs text-slate-400 hover:text-indigo-600"
                            >
                                Admin
                            </button>
                        </div>
                    </form>
                ) : (
                    /* REGISTER FORM (SINGLE PAGE) */
                    <form onSubmit={handleRegisterSubmit} className="space-y-6">

                        {/* 1. Basic Info */}
                        <div className="space-y-4">
                            <h3 className="tex-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider text-xs">1. Dados Pessoais</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Seu nome" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="seu@email.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Quero...</label>
                                <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="renter">Alugar Carros (Locatário)</option>
                                    <option value="owner">Alugar meus Carros (Locador)</option>
                                    <option value="partner">Oferecer Serviços</option>
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                                    <input type="text" required value={cpf} onChange={(e) => setCpf(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="000.000.000-00" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                                    <input type="text" value={rg} onChange={(e) => setRg(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Address */}
                        <div className="space-y-4">
                            <h3 className="tex-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider text-xs">2. Endereço</h3>
                            <div className="relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
                                <div className="flex gap-2">
                                    <input type="text" required value={cep} onChange={(e) => setCep(e.target.value)} onBlur={handleCepBlur} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Digite para buscar..." />
                                    <button type="button" onClick={handleCepBlur} className="p-2 bg-slate-100 rounded-lg"><Search className="w-5 h-5 text-slate-600" /></button>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-2/3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro *</label>
                                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-slate-50" />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Número *</label>
                                    <input type="text" required value={number} onChange={(e) => setNumber(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                    <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-slate-50" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade - UF</label>
                                    <input type="text" readOnly value={city && state ? `${city} - ${state}` : ''} className="w-full px-4 py-2 border rounded-lg bg-slate-100 text-slate-500" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Docs */}
                        <div className="space-y-4">
                            <h3 className="tex-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider text-xs">3. Documentos (Opcional agora, Obrigatório p/ Alugar)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 relative">
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files && setCpfFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                    <p className="text-xs font-medium text-slate-600">Foto CPF/CNH</p>
                                    {cpfFile && <p className="text-[10px] text-green-600 font-bold mt-1 truncate">{cpfFile.name}</p>}
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 relative">
                                    <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files && setResidenceFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                    <p className="text-xs font-medium text-slate-600">Comp. Residência</p>
                                    {residenceFile && <p className="text-[10px] text-green-600 font-bold mt-1 truncate">{residenceFile.name}</p>}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CRIAR CONTA AGORA'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
