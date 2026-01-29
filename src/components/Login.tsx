
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
    const [step, setStep] = useState(1); // 1: Basic, 2: Personal, 3: Docs
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Data
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'owner' | 'renter' | 'partner'>('renter'); // Default to renter

    // Step 2 Data
    const [cpf, setCpf] = useState('');
    const [rg, setRg] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // Step 3 Data (Files)
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

    const handleNextStep = () => {
        if (step === 1) {
            if (!name || !email) { setError('Preencha os campos obrigatórios.'); return; }
            setError('');

            // If user is RENTER, we might want a simpler flow, but USER ASKED for full fields for OWNER platform context usually?
            // Actually request said "para o locador ter pela plataforma", implying RENTER registration needs this so OWNER can see.
            // So we show this for everyone or maybe just Renter? Let's assume everyone for now to be safe/complete.
            setStep(2);
        } else if (step === 2) {
            if (!cpf || !cep || !address || !number) { setError('Preencha os campos obrigatórios.'); return; }
            setError('');
            setStep(3);
        }
    };

    const handleRegisterSubmit = async () => {
        setLoading(true);
        setError('');

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
            setError('Erro ao cadastrar: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-4 animate-fade-in">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo *</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail *</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quero...</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="renter">Alugar Carros (Locatário)</option>
                    <option value="owner">Alugar meus Carros (Locador)</option>
                    <option value="partner">Oferecer Serviços (Mecânica/Seguro)</option>
                </select>
            </div>
            <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
            >
                Continuar
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF *</label>
                    <input
                        type="text"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                    <input
                        type="text"
                        value={rg}
                        onChange={(e) => setRg(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button type="button" onClick={handleCepBlur} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">
                        <Search className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="w-2/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Endereço *</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                </div>
                <div className="w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número *</label>
                    <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                    <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade/UF</label>
                    <input
                        type="text"
                        value={city && state ? `${city} - ${state}` : ''}
                        readOnly
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition"
                >
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition"
                >
                    Próximo
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 flex gap-2">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <p>Para sua segurança e a dos locadores, precisamos validar sua identidade.</p>
            </div>

            <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative group">
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files && setCpfFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500" />
                    <p className="text-sm font-medium text-slate-700">Foto do CPF ou CNH</p>
                    {cpfFile && <p className="text-xs text-green-600 mt-1 font-semibold">{cpfFile.name}</p>}
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative group">
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files && setResidenceFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-indigo-500" />
                    <p className="text-sm font-medium text-slate-700">Comprovante de Residência</p>
                    {residenceFile && <p className="text-xs text-green-600 mt-1 font-semibold">{residenceFile.name}</p>}
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition"
                >
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={handleRegisterSubmit}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Finalizar Cadastro'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in relative overflow-hidden">
                {/* Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-xl mb-4">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {mode === 'login' ? 'Bem-vindo ao VeloCity' : 'Criar minha conta'}
                    </h1>
                    {mode === 'register' && (
                        <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-400">
                            <span className={step >= 1 ? 'text-indigo-600' : ''}>1. Dados</span>
                            <div className="w-4 h-[1px] bg-slate-200" />
                            <span className={step >= 2 ? 'text-indigo-600' : ''}>2. Endereço</span>
                            <div className="w-4 h-[1px] bg-slate-200" />
                            <span className={step >= 3 ? 'text-indigo-600' : ''}>3. Docs</span>
                        </div>
                    )}
                </div>

                {/* Tabs (Only if not in step 2 or 3 of register) */}
                {step === 1 && (
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
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4 animate-shake">
                        {error}
                    </div>
                )}

                {/* Forms */}
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
                    </form>
                ) : (
                    // REGISTER FLOW
                    <div>
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                    </div>
                )}
            </div>
        </div>
    );
};
