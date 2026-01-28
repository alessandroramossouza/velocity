
import React, { useState } from 'react';
import { Car, User } from '../types';
import { Calendar, X, AlertTriangle, CreditCard, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { Payment } from '../services/payments';
import { ContractViewer } from './contract/ContractViewer';

interface RentModalProps {
    car: Car;
    currentUser: User;
    onConfirm: (startDate: string, endDate: string, totalPrice: number) => void;
    onClose: () => void;
    onNeedKYC: () => void;
}

type Step = 'dates' | 'contract' | 'payment';

export const RentModal: React.FC<RentModalProps> = ({ car, currentUser, onConfirm, onClose, onNeedKYC }) => {
    const today = new Date().toISOString().split('T')[0];
    const [step, setStep] = useState<Step>('dates');

    // Rental State
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState('');
    const [showPayment, setShowPayment] = useState(false);

    // Contract State
    const [contractSigned, setContractSigned] = useState(false);
    // In a real app, we would save these to send to the backend
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [contractSnapshot, setContractSnapshot] = useState<string | null>(null);

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

        if (days >= 30 && car.pricePerMonth) {
            const monthlyRate = car.pricePerMonth / 30;
            if (monthlyRate < dailyRate) {
                dailyRate = monthlyRate;
                plan = 'Mensal';
                total = (car.pricePerMonth / 30) * days;
            }
        } else if (days >= 7 && car.pricePerWeek) {
            const weeklyRate = car.pricePerWeek / 7;
            if (weeklyRate < dailyRate) {
                dailyRate = weeklyRate;
                plan = 'Semanal';
                total = (car.pricePerWeek / 7) * days;
            }
        }

        return { total, plan, dailyRate };
    };

    const days = calculateDays();
    const { total: totalPrice, dailyRate: effectiveDailyRate } = calculateBestPrice(days);

    const handleProceedToContract = () => {
        if (days <= 0) {
            alert('Selecione um período válido.');
            return;
        }

        // Check KYC
        if (!currentUser.isVerified) {
            onNeedKYC();
            return;
        }

        setStep('contract');
    };

    const handleContractSigned = (url: string, snapshot: string) => {
        setSignatureUrl(url);
        setContractSnapshot(snapshot);
        setContractSigned(true);
        setStep('payment');
        setShowPayment(true);
    };

    const handlePaymentSuccess = (payment: Payment) => {
        // Here we would normally optimize by sending the contract data to the backend
        // along with the rental creation. For now, we assume the backend handles it or we pass it later.
        // In a full implementation, onConfirm would take these extra params.
        console.log("Contract Signed:", signatureUrl);

        setShowPayment(false);
        onConfirm(startDate, endDate, totalPrice);
    };

    // If showing contract, render full screen contract viewer
    if (step === 'contract') {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[90vh] animate-fade-in">
                    <ContractViewer
                        renter={currentUser}
                        car={car}
                        rentalData={{
                            startDate,
                            endDate,
                            totalPrice,
                            days
                        }}
                        onSigned={handleContractSigned}
                        onCancel={() => setStep('dates')}
                    />
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

            {/* Rent Modal (Date Selection) */}
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="relative">
                        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600">
                            <img
                                src={car.imageUrl}
                                alt={car.model}
                                className="w-full h-full object-cover opacity-30"
                            />
                        </div>
                        <div className="absolute inset-0 p-6 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white">{car.make} {car.model}</h2>
                                <p className="text-indigo-200 text-sm">{car.year} • {car.category}</p>
                            </div>
                            <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {!currentUser.isVerified && (
                        <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                <strong>Atenção:</strong> Verificação necessária.
                            </p>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-slate-900 font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                Período do Aluguel
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Retirada</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        min={today}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Devolução</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        min={startDate || today}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Resumo de Valores</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Diária ({days} dias)</span>
                                    <span>R$ {effectiveDailyRate.toFixed(2)} / dia</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Taxa de Serviço</span>
                                    <span>R$ 0,00</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg mt-2">
                                    <span className="text-slate-900">Total</span>
                                    <span className="text-indigo-600">R$ {totalPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProceedToContract}
                                disabled={days <= 0}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span>Continuar</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Steps Indicator */}
                    <div className="bg-slate-50 p-2 flex justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    </div>
                </div>
            </div>
        </>
    );
};
