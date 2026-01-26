
import React, { useState } from 'react';
import { Car } from '../types';
import { supabase } from '../lib/supabase';
import { CreditCard, X, Loader2, CheckCircle, Smartphone, AlertCircle, Copy } from 'lucide-react';

interface PaymentModalProps {
    car: Car;
    totalPrice: number;
    startDate: string;
    endDate: string;
    renterId: string;
    onPaymentComplete: (paymentId: string) => void;
    onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    car,
    totalPrice,
    startDate,
    endDate,
    renterId,
    onPaymentComplete,
    onClose
}) => {
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [pixCode, setPixCode] = useState('');
    const [copied, setCopied] = useState(false);

    // Simulated PIX code generation
    const generatePixCode = () => {
        const code = `00020126580014BR.GOV.BCB.PIX0136${Math.random().toString(36).substring(2, 15)}5204000053039865404${totalPrice.toFixed(2)}5802BR5925VELOCITY ALUGUEL CARROS6009SAO PAULO62070503***6304`;
        return code;
    };

    const handlePixPayment = async () => {
        setProcessing(true);

        // Simulate PIX generation
        await new Promise(resolve => setTimeout(resolve, 1500));
        const code = generatePixCode();
        setPixCode(code);
        setProcessing(false);
    };

    const handleCreditCardPayment = async () => {
        setProcessing(true);

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create payment record
        const { data, error } = await supabase
            .from('payments')
            .insert({
                amount: totalPrice,
                currency: 'BRL',
                status: 'approved',
                payment_method: 'credit_card',
                payer_id: renterId,
                receiver_id: car.ownerId,
                external_id: `sim_${Date.now()}`
            })
            .select()
            .single();

        if (error) {
            console.error('Payment error:', error);
            alert('Erro ao processar pagamento.');
            setProcessing(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => {
            onPaymentComplete(data.id);
        }, 2000);
    };

    const simulatePixConfirmation = async () => {
        setProcessing(true);

        // Simulate bank confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create payment record
        const { data, error } = await supabase
            .from('payments')
            .insert({
                amount: totalPrice,
                currency: 'BRL',
                status: 'approved',
                payment_method: 'pix',
                payer_id: renterId,
                receiver_id: car.ownerId,
                external_id: `pix_${Date.now()}`
            })
            .select()
            .single();

        if (error) {
            console.error('Payment error:', error);
            alert('Erro ao confirmar pagamento.');
            setProcessing(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => {
            onPaymentComplete(data.id);
        }, 2000);
    };

    const copyPixCode = () => {
        navigator.clipboard.writeText(pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Pagamento Confirmado!</h2>
                    <p className="text-slate-500 mb-4">Seu aluguel foi reservado com sucesso.</p>
                    <p className="text-green-600 font-bold text-xl">R$ {totalPrice.toFixed(2)}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold">Pagamento</h2>
                            <p className="text-green-200 text-sm">{car.make} {car.model}</p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>Período:</span>
                        <span>{new Date(startDate).toLocaleDateString('pt-BR')} - {new Date(endDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-green-600">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="p-6 space-y-4">
                    <p className="text-sm font-medium text-slate-700">Escolha a forma de pagamento:</p>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPaymentMethod('pix')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition ${paymentMethod === 'pix'
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <Smartphone className={`w-8 h-8 ${paymentMethod === 'pix' ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className={`font-medium ${paymentMethod === 'pix' ? 'text-green-700' : 'text-slate-600'}`}>PIX</span>
                            <span className="text-xs text-slate-500">Aprovação instantânea</span>
                        </button>

                        <button
                            onClick={() => setPaymentMethod('credit_card')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition ${paymentMethod === 'credit_card'
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <CreditCard className={`w-8 h-8 ${paymentMethod === 'credit_card' ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className={`font-medium ${paymentMethod === 'credit_card' ? 'text-green-700' : 'text-slate-600'}`}>Cartão</span>
                            <span className="text-xs text-slate-500">Crédito ou Débito</span>
                        </button>
                    </div>

                    {/* PIX Section */}
                    {paymentMethod === 'pix' && !pixCode && (
                        <button
                            onClick={handlePixPayment}
                            disabled={processing}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                            {processing ? 'Gerando PIX...' : 'Gerar Código PIX'}
                        </button>
                    )}

                    {paymentMethod === 'pix' && pixCode && (
                        <div className="space-y-4">
                            <div className="bg-slate-100 p-4 rounded-lg">
                                <p className="text-xs text-slate-500 mb-2">Copie o código PIX:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={pixCode}
                                        readOnly
                                        className="flex-1 p-2 text-xs bg-white border rounded font-mono"
                                    />
                                    <button
                                        onClick={copyPixCode}
                                        className={`px-3 py-2 rounded flex items-center gap-1 text-sm font-medium transition ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                            }`}
                                    >
                                        <Copy className="w-4 h-4" />
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800">
                                    <strong>Demo:</strong> Clique em "Simular Pagamento" para confirmar.
                                </p>
                            </div>

                            <button
                                onClick={simulatePixConfirmation}
                                disabled={processing}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                {processing ? 'Confirmando...' : 'Simular Pagamento PIX'}
                            </button>
                        </div>
                    )}

                    {/* Credit Card Section (Simplified Demo) */}
                    {paymentMethod === 'credit_card' && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800">
                                    <strong>Demo:</strong> Em produção, aqui apareceria o formulário de cartão.
                                </p>
                            </div>

                            <button
                                onClick={handleCreditCardPayment}
                                disabled={processing}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                                {processing ? 'Processando...' : `Pagar R$ ${totalPrice.toFixed(2)}`}
                            </button>
                        </div>
                    )}

                    {/* Security Note */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-4">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Pagamento seguro e criptografado
                    </div>
                </div>
            </div>
        </div>
    );
};
