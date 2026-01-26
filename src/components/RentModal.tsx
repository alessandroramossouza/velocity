
import React, { useState } from 'react';
import { Car, User } from '../types';
import { Calendar, X, CheckCircle, Tag, Shield, AlertTriangle } from 'lucide-react';
import { PaymentModal } from './PaymentModal';

interface RentModalProps {
    car: Car;
    currentUser: User;
    onConfirm: (startDate: string, endDate: string, totalPrice: number) => void;
    onClose: () => void;
    onNeedKYC: () => void;
}

export const RentModal: React.FC<RentModalProps> = ({ car, currentUser, onConfirm, onClose, onNeedKYC }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState('');
    const [showPayment, setShowPayment] = useState(false);

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
    const { total: totalPrice, plan: appliedPlan, dailyRate: effectiveDailyRate } = calculateBestPrice(days);

    const handleProceedToPayment = () => {
        if (days <= 0) {
            alert('Selecione um período válido.');
            return;
        }

        // Check KYC
        if (!currentUser.isVerified) {
            onNeedKYC();
            return;
        }

        setShowPayment(true);
    };

    const handlePaymentComplete = (paymentId: string) => {
        setShowPayment(false);
        onConfirm(startDate, endDate, totalPrice);
    };

    if (showPayment) {
        return (
            <PaymentModal
                car={car}
                totalPrice={totalPrice}
                startDate={startDate}
                endDate={endDate}
                renterId={currentUser.id}
                onPaymentComplete={handlePaymentComplete}
                onClose={() => setShowPayment(false)}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-indigo-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold">{car.make} {car.model}</h2>
                            <p className="text-indigo-200 text-sm">{car.year} • {car.category}</p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* KYC Warning */}
                {!currentUser.isVerified && (
                    <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <p className="text-sm text-amber-800">
                            <strong>Atenção:</strong> Você precisará verificar sua identidade antes de pagar.
                        </p>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium">Selecione o período do aluguel</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                            <input
                                type="date"
                                value={startDate}
                                min={today}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || today}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-slate-600">
                            <span>Quantidade de dias</span>
                            <span>{days} {days === 1 ? 'dia' : 'dias'}</span>
                        </div>

                        {appliedPlan !== 'Diária' && (
                            <div className="flex items-center justify-between text-green-600 text-sm font-medium bg-green-50 p-2 rounded-md">
                                <span className="flex items-center gap-1">
                                    <Tag className="w-4 h-4" /> Desconto aplicado:
                                </span>
                                <span>Plano {appliedPlan}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-slate-600 text-sm">
                            <span>Custo médio por dia</span>
                            <span>R$ {effectiveDailyRate.toFixed(2)}</span>
                        </div>

                        <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-lg mt-2">
                            <span>Total Estimado</span>
                            <span className="text-indigo-600">R$ {totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleProceedToPayment}
                            disabled={days <= 0}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {currentUser.isVerified ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Ir para Pagamento
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    Verificar e Pagar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
