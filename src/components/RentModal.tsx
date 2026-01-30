
import React, { useState, useEffect } from 'react';
import { Car, User } from '../types';
import { Calendar, X, AlertTriangle, ArrowRight, Car as CarIcon, Clock, CheckCircle } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { Payment } from '../services/payments';
import { ContractSignatureModal } from './ContractSignatureModal';

interface RentModalProps {
    car: Car;
    currentUser: User;
    onConfirm: (startDate: string, endDate: string, totalPrice: number) => void;
    onClose: () => void;
    onNeedKYC: () => void;
    onSendProposal?: (startDate: string, months: number, offerPrice: number) => void; // Nova prop para proposta Uber
}

type Step = 'dates' | 'contract' | 'payment' | 'proposal_success';
type Mode = 'daily' | 'uber';

export const RentModal: React.FC<RentModalProps> = ({ car, currentUser, onConfirm, onClose, onNeedKYC, onSendProposal }) => {
    const today = new Date().toISOString().split('T')[0];
    const [step, setStep] = useState<Step>('dates');
    const [mode, setMode] = useState<Mode>('daily');

    // Rental State - Daily
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState('');

    // Rental State - Uber
    const [uberMonths, setUberMonths] = useState(1);

    // Payment / Contract Flow
    const [showPayment, setShowPayment] = useState(false);
    const [contractSigned, setContractSigned] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    // Atualiza endDate automaticamente se mudar para modo Uber ou mudar meses
    useEffect(() => {
        if (mode === 'uber' && startDate) {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + (uberMonths * 30));
            setEndDate(end.toISOString().split('T')[0]);
        }
    }, [mode, uberMonths, startDate]);

    const calculateDays = () => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const calculateBestPrice = (days: number) => {
        let dailyRate = car.pricePerDay;
        let plan = 'Diária';
        let total = days * dailyRate;

        // Fallback: Se diária for 0, mas tiver preço semanal, usa pro-rata base
        if (dailyRate === 0 && car.pricePerWeek && car.pricePerWeek > 0) {
            dailyRate = car.pricePerWeek / 7;
            // Não mudamos o nome do plano ainda, pois pode cair na regra de "Semanal" oficial abaixo se days >= 7
            total = dailyRate * days;
        }

        // Lógica de preço progressivo
        if (days >= 30 && car.pricePerMonth) {
            dailyRate = car.pricePerMonth / 30; // Preço dia efetivo no plano mensal
            plan = 'Mensal';
            total = dailyRate * days;
        } else if (days >= 15 && car.pricePer15Days) {
            dailyRate = car.pricePer15Days / 15;
            plan = 'Quinzenal';
            total = dailyRate * days;
        } else if (days >= 7 && car.pricePerWeek) {
            dailyRate = car.pricePerWeek / 7;
            plan = 'Semanal';
            total = dailyRate * days;
        }

        return { total, plan, dailyRate };
    };

    const days = calculateDays();
    const { total: totalPrice, dailyRate: effectiveDailyRate, plan } = calculateBestPrice(days);

    const handleAction = async () => {
        if (days <= 0 && mode === 'daily') {
            alert('Selecione um período válido.');
            return;
        }

        if (totalPrice === 0 && mode === 'daily') {
            alert('Este veículo não possui preço definido para este período (dias insuficientes para tarifa semanal/mensal).');
            return;
        }

        // Check KYC
        if (!currentUser.isVerified) {
            onNeedKYC();
            return;
        }

        if (mode === 'uber') {
            // Fluxo Proposta UBER
            if (onSendProposal) {
                onSendProposal(startDate, uberMonths, totalPrice);
                setStep('proposal_success');

                // --- NEW: Notify Owner ---
                // We assume `onSendProposal` handles the API call for proposal creation, 
                // but we also want to send the notification here or ensuring `onSendProposal` does it.
                // However, `onSendProposal` implementation is in `RenterMarketplace` (parent).
                // It is safer to send the notification THERE to have access to the created rental/proposal ID.
                // But if we want it HERE for immediate feedback/demo or if `onSendProposal` is simple wrapper:
                // Actually, `onSendProposal` (from RenterMarketplace line 226) calls `createRentalProposal`.
                // Let's rely on RenterMarketplace to send the notification after proposal is created.
                // Wait, User asked to fix it. RenterMarketplace is where the logic resides.
                // I should assume the fix needs to be applied in RenterMarketplace.tsx where `handleSendProposal` is defined.
            } else {
                // Fallback demo local
                setStep('proposal_success');
            }
        } else {
            // Fluxo Diário (Fluxo normal)
            setStep('contract');
        }
    };

    const handleContractSigned = (url: string, snapshot: string) => {
        setSignatureUrl(url);
        setContractSigned(true);
        setStep('payment');
        setShowPayment(true);
    };

    const handlePaymentSuccess = (payment: Payment) => {
        console.log("Contract Signed:", signatureUrl);
        setShowPayment(false);
        onConfirm(startDate, endDate, totalPrice);
    };

    // Render Contract Modal
    if (step === 'contract') {
        return (
            <ContractSignatureModal
                isOpen={step === 'contract'}
                onClose={() => setStep('dates')}
                onSuccess={(url) => handleContractSigned(url, '')}
                car={car}
                user={currentUser}
                rental={{
                    id: crypto.randomUUID(),
                    startDate,
                    endDate,
                    totalPrice,
                    ownerId: car.ownerId,
                    carId: String(car.id),
                    renterId: currentUser.id,
                    status: 'active',
                    createdAt: new Date().toISOString()
                }}
            />
        );
    }

    // Render Proposal Success
    if (step === 'proposal_success') {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Proposta Enviada!</h3>
                    <p className="text-slate-600 mb-6">
                        Sua proposta de aluguel para motorista de app ({uberMonths} {uberMonths > 1 ? 'meses' : 'mês'}) foi enviada para o locador.
                    </p>
                    <p className="text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg">
                        Você será notificado assim que o locador aceitar. O pagamento será solicitado apenas após a aprovação.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Payment Modal */}
            {showPayment && (
                <PaymentModal
                    isOpen={showPayment}
                    onClose={() => { setShowPayment(false); setStep('dates'); }}
                    onSuccess={handlePaymentSuccess}
                    userId={currentUser.id}
                    amount={totalPrice}
                    description={`Aluguel ${car.make} ${car.model} - ${days} dias`}
                    receiverId={car.ownerId}
                />
            )}

            {/* Rent Modal (Main) */}
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">

                    {/* Header Image */}
                    <div className="relative h-32 flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-indigo-900">
                            <img
                                src={car.imageUrl}
                                alt={car.model}
                                className="w-full h-full object-cover opacity-40"
                            />
                        </div>
                        <div className="absolute inset-0 p-6 flex justify-between items-start z-10">
                            <div>
                                <h2 className="text-xl font-bold text-white leading-tight">{car.make} {car.model}</h2>
                                <p className="text-indigo-200 text-sm">{car.year} • {car.category}</p>
                            </div>
                            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition backdrop-blur-sm">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="flex border-b border-slate-100">
                        <button
                            onClick={() => setMode('daily')}
                            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${mode === 'daily' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Particular (Diário)
                        </button>
                        <button
                            onClick={() => setMode('uber')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative overflow-hidden ${mode === 'uber' ? 'text-amber-900 border-b-2 border-amber-500 bg-amber-100' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <CarIcon className="w-4 h-4" />
                            Motorista App (Mensal)
                            <span className="ml-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                NOVO
                            </span>
                        </button>
                    </div>

                    {/* KYC Warning */}
                    {!currentUser.isVerified && (
                        <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2 flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <p className="text-xs text-amber-800">
                                <strong>Verificação necessária</strong> para alugar este veículo.
                            </p>
                        </div>
                    )}

                    {/* Content Scrollable */}
                    <div className="p-6 space-y-6 overflow-y-auto">

                        {/* Mode Description */}
                        {mode === 'uber' && (
                            <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-start gap-3">
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-purple-900">Plano para Motoristas</h4>
                                    <p className="text-xs text-purple-700 mt-1">
                                        Aluguel de longo prazo com condições especiais. Envie uma proposta de meses fechados para o proprietário.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-slate-900 font-semibold flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                Configurar Período
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Data de Retirada</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        min={today}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                {mode === 'daily' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Data de Devolução</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate || today}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-medium text-purple-600 mb-1">Duração (Meses)</label>
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => setUberMonths(Math.max(1, uberMonths - 1))}
                                                className="w-10 h-10 border border-slate-200 rounded-l-lg hover:bg-slate-50 font-bold text-slate-600"
                                            >
                                                -
                                            </button>
                                            <div className="flex-1 h-10 flex items-center justify-center border-t border-b border-slate-200 font-semibold text-slate-900">
                                                {uberMonths} {uberMonths === 1 ? 'Mês' : 'Meses'}
                                            </div>
                                            <button
                                                onClick={() => setUberMonths(Math.min(24, uberMonths + 1))}
                                                className="w-10 h-10 border border-slate-200 rounded-r-lg hover:bg-slate-50 font-bold text-slate-600"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Auto-calc date display for Uber */}
                            {mode === 'uber' && startDate && (
                                <p className="text-xs text-slate-500 text-right">
                                    Devolução prevista: <strong>{new Date(endDate).toLocaleDateString()}</strong> (Auto-ajustado)
                                </p>
                            )}
                        </div>

                        {/* Summary Card */}
                        <div className={`rounded-xl p-4 border ${mode === 'uber' ? 'bg-purple-50/30 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex justify-between">
                                Resumo de Valores
                                <span className={`text-xs px-2 py-0.5 rounded-full ${mode === 'uber' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {plan}
                                </span>
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Diária Efetiva</span>
                                    <span>R$ {effectiveDailyRate.toFixed(2)} / dia</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Duração</span>
                                    <span>{days} dias</span>
                                </div>
                                <div className="border-t border-slate-200/50 pt-2 flex justify-between font-bold text-lg mt-2">
                                    <span className="text-slate-900">Total Estimado</span>
                                    <span className={mode === 'uber' ? 'text-purple-600' : 'text-indigo-600'}>
                                        R$ {totalPrice.toFixed(2)}
                                    </span>
                                </div>
                                {car.requiresSecurityDeposit && (
                                    <div className="pt-2 text-xs text-amber-700 flex items-center gap-1 justify-end">
                                        <AlertTriangle className="w-3 h-3" />
                                        + Caução de R$ {car.securityDepositAmount?.toFixed(2)} (Reembolsável)
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={days <= 0}
                                className={`flex-[2] py-3 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${mode === 'uber'
                                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                            >
                                {mode === 'uber' ? (
                                    <>
                                        <span>Enviar Proposta</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                ) : (
                                    <>
                                        <span>Continuar para Contrato</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
