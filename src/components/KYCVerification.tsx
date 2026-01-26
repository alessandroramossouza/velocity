
import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Shield, Upload, CheckCircle, Loader2, AlertCircle, Camera } from 'lucide-react';

interface KYCVerificationProps {
    user: User;
    onVerified: (updatedUser: User) => void;
    onClose: () => void;
}

export const KYCVerification: React.FC<KYCVerificationProps> = ({ user, onVerified, onClose }) => {
    const [cnhFile, setCnhFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'cnh' | 'selfie' | 'review'>('cnh');

    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error } = await supabase.storage
            .from('verification')
            .upload(filePath, file);

        if (error) throw error;

        const { data } = supabase.storage
            .from('verification')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSubmit = async () => {
        if (!cnhFile || !selfieFile) {
            setError('Por favor, envie ambos os documentos.');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // Upload files
            const cnhUrl = await uploadFile(cnhFile, 'cnh');
            const selfieUrl = await uploadFile(selfieFile, 'selfies');

            // Update user in database
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    cnh_url: cnhUrl,
                    selfie_url: selfieUrl,
                    is_verified: true, // Auto-approve for demo (Real: pending review)
                    verification_date: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            onVerified({
                ...user,
                cnhUrl,
                selfieUrl,
                isVerified: true
            });

        } catch (err) {
            console.error('Verification error:', err);
            setError('Erro ao enviar documentos. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    if (user.isVerified) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Conta Verificada!</h2>
                    <p className="text-slate-500 mb-6">Sua identidade foi confirmada. Você pode alugar carros normalmente.</p>
                    <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                        Continuar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">Verificação de Identidade</h2>
                            <p className="text-indigo-200 text-sm">Necessário para seu primeiro aluguel</p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex border-b border-slate-200">
                    <div className={`flex-1 py-3 text-center text-sm font-medium ${step === 'cnh' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
                        1. CNH
                    </div>
                    <div className={`flex-1 py-3 text-center text-sm font-medium ${step === 'selfie' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
                        2. Selfie
                    </div>
                    <div className={`flex-1 py-3 text-center text-sm font-medium ${step === 'review' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
                        3. Confirmar
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'cnh' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <strong>Dica:</strong> Fotografe a frente da sua CNH em um local bem iluminado.
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 ${cnhFile ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}
                                onClick={() => document.getElementById('cnh-input')?.click()}
                            >
                                <input
                                    id="cnh-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => setCnhFile(e.target.files?.[0] || null)}
                                />
                                {cnhFile ? (
                                    <div className="space-y-2">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                                        <p className="font-medium text-green-700">{cnhFile.name}</p>
                                        <p className="text-xs text-slate-500">Clique para trocar</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                                        <p className="font-medium text-slate-700">Clique para enviar sua CNH</p>
                                        <p className="text-xs text-slate-500">JPG, PNG ou PDF</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setStep('selfie')}
                                disabled={!cnhFile}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                Próximo: Selfie
                            </button>
                        </div>
                    )}

                    {step === 'selfie' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <strong>Dica:</strong> Tire uma selfie segurando a CNH ao lado do rosto.
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 ${selfieFile ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}
                                onClick={() => document.getElementById('selfie-input')?.click()}
                            >
                                <input
                                    id="selfie-input"
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    className="hidden"
                                    onChange={e => setSelfieFile(e.target.files?.[0] || null)}
                                />
                                {selfieFile ? (
                                    <div className="space-y-2">
                                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                                        <p className="font-medium text-green-700">{selfieFile.name}</p>
                                        <p className="text-xs text-slate-500">Clique para trocar</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Camera className="w-12 h-12 text-slate-400 mx-auto" />
                                        <p className="font-medium text-slate-700">Tire uma selfie com a CNH</p>
                                        <p className="text-xs text-slate-500">JPG ou PNG</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep('cnh')} className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition">
                                    Voltar
                                </button>
                                <button
                                    onClick={() => setStep('review')}
                                    disabled={!selfieFile}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                                >
                                    Revisar
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                                <strong>Pronto!</strong> Revise seus documentos e confirme o envio.
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-2">CNH</p>
                                    <p className="font-medium text-sm truncate">{cnhFile?.name}</p>
                                </div>
                                <div className="border rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-2">Selfie</p>
                                    <p className="font-medium text-sm truncate">{selfieFile?.name}</p>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                    <AlertCircle className="w-5 h-5" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setStep('selfie')} className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition">
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                                    {uploading ? 'Enviando...' : 'Confirmar Verificação'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button onClick={onClose} className="w-full text-sm text-slate-500 hover:text-slate-700">
                        Fazer isso depois
                    </button>
                </div>
            </div>
        </div>
    );
};
