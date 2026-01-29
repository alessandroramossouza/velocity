import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Car, User, Rental } from '../types';
import {
    generateFilledContract,
    generateDefaultContract,
    addSignatureToPdf,
    saveSignedContract
} from '../services/contractService';
import {
    FileText,
    PenTool,
    Check,
    X,
    Loader2,
    RotateCcw,
    Download,
    Shield,
    AlertCircle
} from 'lucide-react';

interface ContractSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (signedPdfUrl: string) => void;
    car: Car;
    user: User;
    rental: {
        id: string;
        startDate: string;
        endDate: string;
        totalPrice: number;
        ownerId: string;
        carId: string;
        renterId: string;
        status: 'active' | 'completed' | 'cancelled';
        createdAt: string;
    };
}

export const ContractSignatureModal: React.FC<ContractSignatureModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    car,
    user,
    rental,
}) => {
    const [step, setStep] = useState<'review' | 'sign' | 'processing' | 'done'>('review');
    const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const signatureRef = useRef<SignatureCanvas>(null);

    useEffect(() => {
        if (isOpen) {
            loadContract();
        }
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [isOpen]);

    const loadContract = async () => {
        setLoading(true);
        setError(null);

        try {
            let result;

            if (car.contractPdfUrl) {
                // Usa o contrato customizado do locador
                result = await generateFilledContract(car, user, rental);
            }

            if (!result) {
                // Gera contrato padrão se não houver customizado
                result = await generateDefaultContract(car, user, rental);
            }

            setPdfBytes(result.pdfBytes);
            const blobUrl = URL.createObjectURL(result.pdfBlob);
            setPdfBlobUrl(blobUrl);
        } catch (err) {
            console.error('Error loading contract:', err);
            setError('Erro ao carregar o contrato. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const clearSignature = () => {
        signatureRef.current?.clear();
    };

    const handleSign = async () => {
        if (!signatureRef.current || signatureRef.current.isEmpty()) {
            setError('Por favor, assine o contrato antes de continuar.');
            return;
        }

        if (!pdfBytes) {
            setError('Contrato não carregado.');
            return;
        }

        setProcessing(true);
        setStep('processing');
        setError(null);

        try {
            // Obtém a assinatura como imagem
            const signatureDataUrl = signatureRef.current.toDataURL('image/png');

            // Adiciona a assinatura ao PDF
            const signedPdfBytes = await addSignatureToPdf(pdfBytes, signatureDataUrl);

            if (!signedPdfBytes) {
                throw new Error('Falha ao adicionar assinatura ao PDF');
            }

            // Salva o contrato assinado
            const savedContract = await saveSignedContract(
                rental as Rental,
                car,
                user,
                signedPdfBytes,
                signatureDataUrl
            );

            if (!savedContract) {
                throw new Error('Falha ao salvar contrato assinado');
            }

            setStep('done');

            // Aguarda um pouco para mostrar sucesso
            setTimeout(() => {
                onSuccess(savedContract.signedPdfUrl);
            }, 2000);

        } catch (err) {
            console.error('Error signing contract:', err);
            setError('Erro ao processar assinatura. Tente novamente.');
            setStep('sign');
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Contrato de Locação</h2>
                            <p className="text-indigo-200 text-sm">{car.make} {car.model} {car.year}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="p-2 hover:bg-white/20 rounded-lg transition disabled:opacity-50"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center justify-center gap-4">
                        {['Revisar', 'Assinar', 'Processar', 'Concluído'].map((label, index) => {
                            const stepIndex = ['review', 'sign', 'processing', 'done'].indexOf(step);
                            const isActive = index === stepIndex;
                            const isCompleted = index < stepIndex;

                            return (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isCompleted ? 'bg-green-500 text-white' :
                                            isActive ? 'bg-indigo-600 text-white' :
                                                'bg-slate-200 text-slate-500'
                                        }`}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <span className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {label}
                                    </span>
                                    {index < 3 && <div className="w-8 h-0.5 bg-slate-200" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                            <p className="text-slate-600">Preparando seu contrato...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={loadContract}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : step === 'review' ? (
                        <div className="space-y-6">
                            {/* Contract Preview */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                                {pdfBlobUrl ? (
                                    <iframe
                                        src={pdfBlobUrl}
                                        className="w-full h-[400px]"
                                        title="Contrato de Locação"
                                    />
                                ) : (
                                    <div className="h-[400px] flex items-center justify-center text-slate-500">
                                        Carregando contrato...
                                    </div>
                                )}
                            </div>

                            {/* Contract Summary */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Resumo do Contrato
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-indigo-600 font-medium">Veículo</p>
                                        <p className="text-slate-800">{car.make} {car.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-indigo-600 font-medium">Período</p>
                                        <p className="text-slate-800">
                                            {new Date(rental.startDate).toLocaleDateString('pt-BR')} - {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-indigo-600 font-medium">Valor Total</p>
                                        <p className="text-slate-800 font-bold text-green-700">R$ {rental.totalPrice.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-indigo-600 font-medium">Locatário</p>
                                        <p className="text-slate-800">{user.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => setStep('sign')}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <PenTool className="w-5 h-5" />
                                    Prosseguir para Assinatura
                                </button>
                            </div>
                        </div>
                    ) : step === 'sign' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Assine o Contrato</h3>
                                <p className="text-slate-500">Use o mouse ou o dedo para desenhar sua assinatura abaixo</p>
                            </div>

                            {/* Signature Canvas */}
                            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white p-4">
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                    <SignatureCanvas
                                        ref={signatureRef}
                                        canvasProps={{
                                            className: 'w-full h-48 bg-white cursor-crosshair',
                                            style: { width: '100%', height: '200px' }
                                        }}
                                        backgroundColor="white"
                                        penColor="rgb(30, 58, 138)"
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <button
                                        onClick={clearSignature}
                                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Limpar Assinatura
                                    </button>
                                    <span className="text-xs text-slate-400">
                                        Ao assinar, você concorda com os termos do contrato
                                    </span>
                                </div>
                            </div>

                            {/* Legal Notice */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800">Aviso Legal</p>
                                        <p className="text-amber-700 mt-1">
                                            Esta assinatura eletrônica tem validade jurídica conforme a Lei 14.063/2020.
                                            Seu IP e data/hora serão registrados para fins de comprovação.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-3">
                                <button
                                    onClick={() => setStep('review')}
                                    className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleSign}
                                    disabled={processing}
                                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    Assinar e Confirmar Aluguel
                                </button>
                            </div>
                        </div>
                    ) : step === 'processing' ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-pulse" />
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-slate-800 font-semibold mt-6">Processando sua assinatura...</p>
                            <p className="text-slate-500 text-sm mt-2">Aguarde enquanto geramos seu contrato assinado</p>
                        </div>
                    ) : step === 'done' ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Contrato Assinado!</h3>
                            <p className="text-slate-500 text-center max-w-md">
                                Seu contrato foi assinado e registrado com sucesso.
                                Uma cópia será enviada para seu e-mail.
                            </p>
                            <div className="mt-6 flex gap-3">
                                {pdfBlobUrl && (
                                    <a
                                        href={pdfBlobUrl}
                                        download={`contrato_${car.make}_${car.model}.pdf`}
                                        className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Baixar Contrato
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
