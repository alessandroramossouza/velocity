
import React, { useState, useEffect } from 'react';
import { Car, User } from '../types';
import { Calendar, X, AlertTriangle, ArrowRight, Car as CarIcon, Clock, CheckCircle } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { Payment } from '../services/payments';
import { ContractSignatureModal } from './ContractSignatureModal';

interface RentModalProps {
    car: Car;
    currentUser: User;
    onConfirm: (startDate: string, endDate: string, totalPrice: number, paymentId?: string) => void;
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
        let plan = 'Diária';
        let total = 0;
        let dailyRate = car.pricePerDay;
        let cycles = 0;
        let cyclePrice = 0;

        // Lógica de preço por CICLOS FECHADOS (não proporcional)
        if (days >= 30 && car.pricePerMonth && car.pricePerMonth > 0) {
            // MENSAL: Calcular quantos meses completos + dias extras
            cycles = Math.floor(days / 30);
            const extraDays = days % 30;
            
            cyclePrice = car.pricePerMonth;
            total = cycles * car.pricePerMonth;
            
            // Dias extras: usar quinzenal, semanal ou diária
            if (extraDays > 0) {
                if (extraDays >= 15 && car.pricePer15Days) {
                    total += car.pricePer15Days;
                } else if (extraDays >= 7 && car.pricePerWeek) {
                    total += car.pricePerWeek;
                } else {
                    total += extraDays * car.pricePerDay;
                }
            }
            
            plan = 'Mensal';
            dailyRate = car.pricePerMonth / 30;
        } else if (days >= 15 && car.pricePer15Days && car.pricePer15Days > 0) {
            // QUINZENAL: Calcular quantas quinzenas completas + dias extras
            cycles = Math.floor(days / 15);
            const extraDays = days % 15;
            
            cyclePrice = car.pricePer15Days;
            total = cycles * car.pricePer15Days;
            
            // Dias extras: usar semanal ou diária
            if (extraDays > 0) {
                if (extraDays >= 7 && car.pricePerWeek) {
                    total += car.pricePerWeek;
                } else {
                    total += extraDays * car.pricePerDay;
                }
            }
            
            plan = 'Quinzenal';
            dailyRate = car.pricePer15Days / 15;
        } else if (days >= 7 && car.pricePerWeek && car.pricePerWeek > 0) {
            // SEMANAL: Calcular quantas semanas completas + dias extras
            cycles = Math.floor(days / 7);
            const extraDays = days % 7;
            
            cyclePrice = car.pricePerWeek;
            total = cycles * car.pricePerWeek;
            
            // Dias extras: usar diária
            if (extraDays > 0) {
                total += extraDays * car.pricePerDay;
            }
            
            plan = 'Semanal';
            dailyRate = car.pricePerWeek / 7;
        } else {
            // DIÁRIA: Menos de 7 dias ou sem preços especiais
            plan = 'Diária';
            total = days * car.pricePerDay;
            dailyRate = car.pricePerDay;
            cycles = days;
            cyclePrice = car.pricePerDay;
        }

        return { total, plan, dailyRate, cycles, cyclePrice };
    };

    const days = calculateDays();
    const { total: rentalPrice, dailyRate: effectiveDailyRate, plan, cycles, cyclePrice } = calculateBestPrice(days);

    // Determine the First Cycle Price (Base Period Price)
    // Para modo UBER, usar o paymentFrequency do locador
    const effectivePlan = (mode === 'uber' && car.paymentFrequency)
        ? (car.paymentFrequency === 'weekly' ? 'Semanal' : car.paymentFrequency === 'biweekly' ? 'Quinzenal' : 'Mensal')
        : plan;

    // Primeiro pagamento = primeiro ciclo + caução
    let firstCyclePrice = cyclePrice;
    
    if (mode === 'uber') {
        // Para motorista app, usar o preço definido pelo locador para a frequência escolhida
        if (effectivePlan === 'Mensal' && car.pricePerMonth) {
            firstCyclePrice = car.pricePerMonth;
        } else if (effectivePlan === 'Quinzenal' && car.pricePer15Days) {
            firstCyclePrice = car.pricePer15Days;
        } else if (effectivePlan === 'Semanal' && car.pricePerWeek) {
            firstCyclePrice = car.pricePerWeek;
        } else {
            // Fallback se o locador não definiu o preço para essa frequência
            firstCyclePrice = rentalPrice / Math.max(1, cycles);
        }
    } else {
        // Para modo diário, usar o preço total calculado se for curto (< 1 ciclo)
        if (cycles < 1) {
            firstCyclePrice = rentalPrice;
        }
    }

    const securityDeposit = car.requiresSecurityDeposit ? (car.securityDepositAmount || 0) : 0;
    const initialTotal = firstCyclePrice + securityDeposit;

    // Valor total do contrato (sem caução, pois caução é devolvida)
    const contractTotalValue = rentalPrice;

    const handleAction = async () => {
        if (days <= 0 && mode === 'daily') {
            alert('Selecione um período válido.');
            return;
        }

        if (contractTotalValue === 0 && mode === 'daily') {
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
                onSendProposal(startDate, uberMonths, contractTotalValue);
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
        // Pass contractTotalValue as the total rental value, but payment was initialTotal
        onConfirm(startDate, endDate, contractTotalValue, payment.id);
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
                    totalPrice: contractTotalValue,
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
                    amount={initialTotal}
                    description={`Aluguel ${car.make} ${car.model} - ${days} dias`}
                    receiverId={car.ownerId}
                    paymentOptions={[
                        {
                            id: 'full_initial',
                            label: 'Pagamento Inicial',
                            amount: initialTotal,
                            description: `Aluguel + Caução`,
                            recommended: true
                        }
                    ]}
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
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex justify-between items-center">
                                <span>Resumo de Valores</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${mode === 'uber' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {effectivePlan}
                                </span>
                            </h4>
                            <div className="space-y-2.5 text-sm">
                                {/* Plano e Frequência */}
                                <div className="bg-white/50 rounded-lg p-2 border border-slate-200">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-slate-600">Plano Escolhido</span>
                                        <span className="text-xs font-bold text-indigo-600">{effectivePlan}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-700">
                                        <span className="text-xs">Valor do {effectivePlan === 'Mensal' ? 'Mês' : effectivePlan === 'Semanal' ? 'Semana' : effectivePlan === 'Quinzenal' ? '15 Dias' : 'Dia'}</span>
                                        <span className="font-bold">R$ {cyclePrice.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Duração Total */}
                                <div className="flex justify-between text-slate-600">
                                    <span>Duração Total</span>
                                    <span className="font-medium">{days} {days === 1 ? 'dia' : 'dias'}</span>
                                </div>

                                {/* Número de Ciclos */}
                                {cycles >= 1 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>{effectivePlan === 'Mensal' ? 'Meses' : effectivePlan === 'Semanal' ? 'Semanas' : effectivePlan === 'Quinzenal' ? 'Quinzenas' : 'Dias'}</span>
                                        <span className="font-medium">{cycles > 0 ? Math.floor(cycles) : cycles}</span>
                                    </div>
                                )}

                                {/* Valor Total do Contrato */}
                                <div className="flex justify-between text-slate-800 pt-1 font-medium border-t border-slate-200">
                                    <span>Valor Total do Contrato</span>
                                    <span>R$ {contractTotalValue.toFixed(2)}</span>
                                </div>

                                {/* Caução */}
                                {car.requiresSecurityDeposit && (
                                    <div className="flex justify-between text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
                                        <span className="flex items-center gap-1 text-xs font-semibold">
                                            <AlertTriangle className="w-3 h-3" /> 
                                            Caução (Devolvida)
                                        </span>
                                        <span className="font-bold">R$ {car.securityDepositAmount?.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Observação sobre pagamentos */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-[10px] text-blue-800">
                                    <p className="font-semibold mb-1 flex items-center gap-1">
                                        ℹ️ Como funciona o pagamento:
                                    </p>
                                    {mode === 'uber' ? (
                                        <div className="space-y-1">
                                            <p className="flex items-center gap-1">
                                                <span className="text-amber-600 font-bold">1º pagamento:</span> R$ {initialTotal.toFixed(2)} (Aluguel + Caução)
                                            </p>
                                            <p className="flex items-center gap-1">
                                                <span className="text-green-600 font-bold">Próximos pagamentos:</span> R$ {firstCyclePrice.toFixed(2)} (sem caução)
                                            </p>
                                            <p className="text-[9px] text-blue-600 mt-1 italic">
                                                ⚠️ Caução cobrada APENAS no 1º pagamento e devolvida no final!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p>Pagamento único no início do contrato.</p>
                                            <p className="text-[9px] text-blue-600 italic">
                                                Caução devolvida no final ({car.requiresSecurityDeposit ? `R$ ${securityDeposit.toFixed(2)}` : 'N/A'}).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total a Pagar Agora */}
                            <div className="border-t-2 border-slate-300 pt-3 mt-3">
                                <div className="flex justify-between items-end">
                                    <div className="text-left">
                                        <span className="block text-sm font-bold text-slate-900">
                                            {mode === 'uber' ? '1º Pagamento (Hoje)' : 'Total a Pagar Agora'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-normal">
                                            {mode === 'uber' 
                                                ? (car.requiresSecurityDeposit ? 'Aluguel + Caução (única vez)' : '1º Ciclo')
                                                : (car.requiresSecurityDeposit ? 'Valor Total + Caução' : 'Valor Total')
                                            }
                                        </span>
                                        {mode === 'uber' && car.requiresSecurityDeposit && (
                                            <span className="block text-[9px] text-green-600 font-semibold mt-1">
                                                Próximos: R$ {firstCyclePrice.toFixed(2)}/ciclo
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-2xl font-black ${mode === 'uber' ? 'text-purple-600' : 'text-indigo-600'}`}>
                                            R$ {initialTotal.toFixed(2)}
                                        </span>
                                        {car.requiresSecurityDeposit && (
                                            <p className="text-[9px] text-slate-500 mt-0.5">
                                                (R$ {firstCyclePrice.toFixed(2)} + R$ {securityDeposit.toFixed(2)} caução)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
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
        </>
    );
};

