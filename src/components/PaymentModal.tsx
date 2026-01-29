import React, { useState, useEffect } from 'react';
import {
    X, CreditCard, QrCode, FileText, Copy, Check, Download, Loader2,
    Shield, Clock, CheckCircle, AlertCircle, ChevronDown, Trash2, Star
} from 'lucide-react';
import {
    Payment, SavedCard, CardData,
    createPixPayment, createBoletoPayment, createCardPayment,
    getSavedCards, deleteCard, setDefaultCard, calculateInstallments, InstallmentOption
} from '../services/payments';

// =====================================================
// TYPES
// =====================================================

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (payment: Payment) => void;
    userId: string;
    amount: number;
    description: string;
    receiverId?: string;
    rentalId?: string;
    serviceRequestId?: string;
    // New Props for "Mega Ultra Forte" Payment Selection
    paymentOptions?: PaymentOption[];
}

export interface PaymentOption {
    id: string;
    label: string;
    amount: number;
    description: string;
    tag?: string;
    recommended?: boolean;
}

type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    userId,
    amount,
    description,
    receiverId,
    rentalId,
    serviceRequestId,
    paymentOptions
}) => {
    const [method, setMethod] = useState<PaymentMethod>('pix');
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Payment Option State (Weekly vs Monthly)
    const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null);
    const [localOptions, setLocalOptions] = useState<PaymentOption[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        if (paymentOptions && paymentOptions.length > 0) {
            setLocalOptions(paymentOptions);
            const recommended = paymentOptions.find(o => o.recommended) || paymentOptions[0];
            setSelectedOption(recommended);
        } else if (amount > 800) { // Fallback for High amount -> assume Monthly
            const monthlyAmt = amount;
            const weeklyAmt = amount / 4;
            const fallbackOptions = [
                {
                    id: 'monthly',
                    label: 'Pagamento Mensal',
                    amount: monthlyAmt,
                    description: `Total (Mensal)`,
                    recommended: true
                },
                {
                    id: 'weekly',
                    label: 'Pagamento Semanal',
                    amount: weeklyAmt,
                    description: `Parcela Semanal`,
                    tag: 'Flexível'
                }
            ];
            setLocalOptions(fallbackOptions);
            setSelectedOption(fallbackOptions[0]);
        } else {
            // Low amount, just one option
            setLocalOptions([]);
            setSelectedOption({
                id: 'default',
                label: 'Total',
                amount: amount,
                description: description
            });
        }
    }, [isOpen, paymentOptions, amount]);

    // Effective Amount
    const currentAmount = selectedOption ? selectedOption.amount : amount;
    const currentDescription = selectedOption ? selectedOption.description : description;

    // Card state
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [cardData, setCardData] = useState<CardData>({
        number: '',
        holderName: '',
        expiryMonth: 1,
        expiryYear: new Date().getFullYear(),
        cvv: '',
        saveCard: false
    });
    const [selectedInstallments, setSelectedInstallments] = useState(1);
    const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);

    // PIX/Boleto state
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadSavedCards();
        }
    }, [isOpen, userId]);

    useEffect(() => {
        if (isOpen && currentAmount) {
            setInstallmentOptions(calculateInstallments(currentAmount));
        }
    }, [isOpen, currentAmount]);

    const loadSavedCards = async () => {
        const cards = await getSavedCards(userId);
        setSavedCards(cards);
        if (cards.length > 0) {
            const defaultCard = cards.find(c => c.isDefault) || cards[0];
            setSelectedCardId(defaultCard.id);
        }
    };

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        try {
            let newPayment: Payment | null = null;

            const baseParams = {
                userId,
                receiverId,
                rentalId,
                serviceRequestId,
                amount: currentAmount,
                method,
                description: currentDescription,
                installments: selectedInstallments,
                metaData: selectedOption ? { optionId: selectedOption.id } : undefined
            };

            switch (method) {
                case 'pix':
                    newPayment = await createPixPayment(baseParams);
                    break;
                case 'boleto':
                    newPayment = await createBoletoPayment(baseParams);
                    break;
                case 'credit_card':
                    if (!validateCardForm()) {
                        setError('Por favor, preencha todos os dados do cartão corretamente.');
                        setLoading(false);
                        return;
                    }
                    newPayment = await createCardPayment(baseParams, cardData);
                    break;
            }

            if (newPayment) {
                setPayment(newPayment);
                if (newPayment.status === 'approved') {
                    onSuccess(newPayment);
                }
            } else {
                setError('Erro ao processar pagamento. Tente novamente.');
            }
        } catch (e) {
            setError('Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const validateCardForm = (): boolean => {
        const { number, holderName, expiryMonth, expiryYear, cvv } = cardData;
        if (number.replace(/\s/g, '').length < 13) return false;
        if (holderName.trim().length < 3) return false;
        if (cvv.length < 3) return false;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) return false;
        return true;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ') : cleaned;
    };

    const handleDeleteCard = async (cardId: string) => {
        await deleteCard(cardId);
        setSavedCards(savedCards.filter(c => c.id !== cardId));
        if (selectedCardId === cardId) {
            setSelectedCardId(savedCards[0]?.id || null);
        }
    };

    const handleSetDefault = async (cardId: string) => {
        await setDefaultCard(cardId, userId);
        setSavedCards(savedCards.map(c => ({ ...c, isDefault: c.id === cardId })));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden animate-slide-up">
                {/* Header */}
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <CreditCard className="w-6 h-6" />
                                Pagamento
                            </h2>
                            <p className="text-indigo-100 text-sm mt-1">{currentDescription}</p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="mt-4 bg-white/20 rounded-xl p-4">
                        <p className="text-sm text-indigo-100">Valor a pagar</p>
                        <p className="text-3xl font-bold">R$ {currentAmount.toFixed(2)}</p>
                    </div>
                </div>

                {/* Payment completed */}
                {payment && payment.status === 'approved' ? (
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Pagamento Aprovado!</h3>
                        <p className="text-slate-500 mb-6">Seu pagamento foi processado com sucesso.</p>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
                        >
                            Concluir
                        </button>
                    </div>
                ) : payment && (payment.method === 'pix' || payment.method === 'boleto') ? (
                    // Show PIX or Boleto details
                    <div className="p-6">
                        {payment.method === 'pix' ? (
                            <PixDetails payment={payment} onCopy={copyToClipboard} copied={copied} />
                        ) : (
                            <BoletoDetails payment={payment} onCopy={copyToClipboard} copied={copied} />
                        )}
                    </div>
                ) : (
                    // Payment method selection and forms
                    <div className="p-6 overflow-y-auto max-h-[60vh]">

                        {/* Payment Options Selection Strategy (Weekly vs Monthly) */}
                        {localOptions && localOptions.length > 0 && (
                            <div className="mb-6 bg-slate-50 p-1 rounded-xl flex">
                                {localOptions.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setSelectedOption(option)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 relative
                                            ${selectedOption?.id === option.id
                                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {option.label}
                                        {option.tag && (
                                            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                                {option.tag}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Method Tabs */}
                        <div className="flex gap-2 mb-6">
                            {[
                                { id: 'pix', icon: QrCode, label: 'PIX' },
                                { id: 'credit_card', icon: CreditCard, label: 'Cartão' },
                                { id: 'boleto', icon: FileText, label: 'Boleto' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMethod(tab.id as PaymentMethod)}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2
                    ${method === tab.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Method Content */}
                        {method === 'pix' && <PixForm />}
                        {method === 'credit_card' && (
                            <CardForm
                                cardData={cardData}
                                setCardData={setCardData}
                                savedCards={savedCards}
                                selectedCardId={selectedCardId}
                                setSelectedCardId={setSelectedCardId}
                                installmentOptions={installmentOptions}
                                selectedInstallments={selectedInstallments}
                                setSelectedInstallments={setSelectedInstallments}
                                onDeleteCard={handleDeleteCard}
                                onSetDefault={handleSetDefault}
                                formatCardNumber={formatCardNumber}
                            />
                        )}
                        {method === 'boleto' && <BoletoForm />}

                        {/* Submit Button */}
                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processando...
                                </>
                            ) : method === 'pix' ? (
                                'Gerar QR Code PIX'
                            ) : method === 'boleto' ? (
                                'Gerar Boleto'
                            ) : (
                                `Pagar R$ ${method === 'credit_card' ? (installmentOptions[selectedInstallments - 1]?.installmentValue.toFixed(2) || currentAmount.toFixed(2)) : currentAmount.toFixed(2)}`
                            )}
                        </button>

                        {/* Security badge */}
                        <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                            <Shield className="w-4 h-4" />
                            Pagamento 100% seguro e criptografado
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// =====================================================
// PIX COMPONENTS
// =====================================================

const PixForm: React.FC = () => (
    <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <QrCode className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-green-800">Pagamento via PIX</h4>
                    <p className="text-sm text-green-700 mt-1">
                        Ao confirmar, será gerado um QR Code e um código para copiar e colar no seu banco.
                    </p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Pagamento instantâneo</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Sem taxas adicionais</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>Válido por 30 minutos</span>
        </div>
    </div>
);

interface PixDetailsProps {
    payment: Payment;
    onCopy: (text: string) => void;
    copied: boolean;
}

const PixDetails: React.FC<PixDetailsProps> = ({ payment, onCopy, copied }) => (
    <div className="space-y-6">
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Escaneie o QR Code</h3>
            <p className="text-sm text-slate-500">Use o app do seu banco para escanear</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-lg">
                <img
                    src={payment.pixQrcode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.pixCode || '')}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                />
            </div>
        </div>

        {/* PIX Code */}
        <div>
            <p className="text-sm text-slate-500 mb-2">Ou copie o código PIX:</p>
            <div className="flex gap-2">
                <input
                    type="text"
                    readOnly
                    value={payment.pixCode || ''}
                    className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-600 truncate"
                />
                <button
                    onClick={() => onCopy(payment.pixCode || '')}
                    className={`px-4 py-3 rounded-lg font-medium transition flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                </button>
            </div>
        </div>

        {/* Timer */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-orange-500" />
            <div>
                <p className="font-medium text-orange-800">Este código expira em 30 minutos</p>
                <p className="text-sm text-orange-600">Após o vencimento, você precisará gerar um novo código.</p>
            </div>
        </div>
    </div>
);

// =====================================================
// CARD COMPONENTS
// =====================================================

interface CardFormProps {
    cardData: CardData;
    setCardData: React.Dispatch<React.SetStateAction<CardData>>;
    savedCards: SavedCard[];
    selectedCardId: string | null;
    setSelectedCardId: (id: string | null) => void;
    installmentOptions: InstallmentOption[];
    selectedInstallments: number;
    setSelectedInstallments: (n: number) => void;
    onDeleteCard: (id: string) => void;
    onSetDefault: (id: string) => void;
    formatCardNumber: (value: string) => string;
}

const CardForm: React.FC<CardFormProps> = ({
    cardData,
    setCardData,
    savedCards,
    selectedCardId,
    setSelectedCardId,
    installmentOptions,
    selectedInstallments,
    setSelectedInstallments,
    onDeleteCard,
    onSetDefault,
    formatCardNumber
}) => {
    const [useNewCard, setUseNewCard] = useState(savedCards.length === 0);

    return (
        <div className="space-y-4">
            {/* Saved Cards */}
            {savedCards.length > 0 && (
                <div className="space-y-3">
                    <p className="font-medium text-slate-700">Cartões salvos</p>
                    {savedCards.map(card => (
                        <div
                            key={card.id}
                            onClick={() => { setSelectedCardId(card.id); setUseNewCard(false); }}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition flex items-center justify-between ${selectedCardId === card.id && !useNewCard
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-8 h-8 text-slate-400" />
                                <div>
                                    <p className="font-medium text-slate-800">{card.brand} •••• {card.lastDigits}</p>
                                    <p className="text-xs text-slate-500">{card.holderName} • {card.expiryMonth}/{card.expiryYear}</p>
                                </div>
                                {card.isDefault && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                                        Padrão
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!card.isDefault && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSetDefault(card.id); }}
                                        className="p-2 text-slate-400 hover:text-indigo-600 transition"
                                        title="Definir como padrão"
                                    >
                                        <Star className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteCard(card.id); }}
                                    className="p-2 text-slate-400 hover:text-red-600 transition"
                                    title="Remover cartão"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => setUseNewCard(true)}
                        className={`w-full p-4 border-2 border-dashed rounded-xl transition ${useNewCard ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
                            }`}
                    >
                        <span className="text-slate-600 font-medium">+ Usar outro cartão</span>
                    </button>
                </div>
            )}

            {/* New Card Form */}
            {(useNewCard || savedCards.length === 0) && (
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Número do Cartão</label>
                        <input
                            type="text"
                            maxLength={19}
                            placeholder="0000 0000 0000 0000"
                            value={cardData.number}
                            onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome no Cartão</label>
                        <input
                            type="text"
                            placeholder="NOME COMO NO CARTÃO"
                            value={cardData.holderName}
                            onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                            <div className="flex gap-2">
                                <select
                                    value={cardData.expiryMonth}
                                    onChange={(e) => setCardData({ ...cardData, expiryMonth: parseInt(e.target.value) })}
                                    className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                    ))}
                                </select>
                                <select
                                    value={cardData.expiryYear}
                                    onChange={(e) => setCardData({ ...cardData, expiryYear: parseInt(e.target.value) })}
                                    className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CVV</label>
                            <input
                                type="text"
                                maxLength={4}
                                placeholder="123"
                                value={cardData.cvv}
                                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={cardData.saveCard}
                            onChange={(e) => setCardData({ ...cardData, saveCard: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600">Salvar cartão para futuras compras</span>
                    </label>
                </div>
            )}

            {/* Installments */}
            <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Parcelamento</label>
                <select
                    value={selectedInstallments}
                    onChange={(e) => setSelectedInstallments(parseInt(e.target.value))}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {installmentOptions.map(opt => (
                        <option key={opt.installments} value={opt.installments}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// =====================================================
// BOLETO COMPONENTS
// =====================================================

const BoletoForm: React.FC = () => (
    <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div>
                    <h4 className="font-semibold text-blue-800">Boleto Bancário</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        O boleto será gerado com vencimento para 3 dias úteis. Você poderá copiar o código de barras
                        ou baixar o PDF.
                    </p>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Vencimento em 3 dias úteis</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Compensação em até 3 dias úteis após pagamento</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span>Confirmação só após compensação bancária</span>
        </div>
    </div>
);

interface BoletoDetailsProps {
    payment: Payment;
    onCopy: (text: string) => void;
    copied: boolean;
}

const BoletoDetails: React.FC<BoletoDetailsProps> = ({ payment, onCopy, copied }) => (
    <div className="space-y-6">
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Boleto Gerado</h3>
            <p className="text-sm text-slate-500">
                Vencimento: {payment.boletoDueDate ? new Date(payment.boletoDueDate).toLocaleDateString('pt-BR') : '-'}
            </p>
        </div>

        {/* Boleto Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs text-slate-500">Beneficiário</p>
                    <p className="font-medium text-slate-800">VeloCity Serviços LTDA</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500">Valor</p>
                    <p className="text-xl font-bold text-slate-900">R$ {payment.amount.toFixed(2)}</p>
                </div>
            </div>

            {/* Barcode */}
            <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-center mb-3">
                    <div className="h-12 w-full bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] opacity-80" />
                </div>
                <p className="text-center font-mono text-sm text-slate-700 tracking-wider">
                    {payment.boletoCode}
                </p>
            </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
            <button
                onClick={() => onCopy(payment.boletoBarcode || payment.boletoCode || '')}
                className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
            >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiado!' : 'Copiar Código'}
            </button>
            <button
                onClick={() => window.open(payment.boletoUrl, '_blank')}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
                <Download className="w-5 h-5" />
                Baixar PDF
            </button>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">
                O boleto pode levar até 3 dias úteis para ser compensado após o pagamento.
                Seu aluguel será confirmado automaticamente.
            </p>
        </div>
    </div>
);

export default PaymentModal;
