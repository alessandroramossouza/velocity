import React, { useState, useEffect } from 'react';
import {
    CreditCard, QrCode, FileText, Clock, CheckCircle, XCircle, RefreshCw,
    ChevronRight, Filter, Download, AlertCircle, Loader2, DollarSign
} from 'lucide-react';
import { Payment, getPaymentsByUser } from '../services/payments';

interface PaymentHistoryProps {
    userId: string;
}

type FilterStatus = 'all' | 'approved' | 'pending' | 'rejected' | 'refunded';

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ userId }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

    useEffect(() => {
        loadPayments();
    }, [userId]);

    const loadPayments = async () => {
        setLoading(true);
        const data = await getPaymentsByUser(userId);
        setPayments(data);
        setLoading(false);
    };

    const filteredPayments = payments.filter(p => {
        if (filterStatus === 'all') return true;
        return p.status === filterStatus;
    });

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'pix':
                return <QrCode className="w-5 h-5" />;
            case 'credit_card':
                return <CreditCard className="w-5 h-5" />;
            case 'boleto':
                return <FileText className="w-5 h-5" />;
            default:
                return <DollarSign className="w-5 h-5" />;
        }
    };

    const getMethodLabel = (method: string) => {
        switch (method) {
            case 'pix':
                return 'PIX';
            case 'credit_card':
                return 'Cartão de Crédito';
            case 'boleto':
                return 'Boleto';
            default:
                return method;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Aprovado' };
            case 'pending':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pendente' };
            case 'processing':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw, label: 'Processando' };
            case 'rejected':
                return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejeitado' };
            case 'refunded':
                return { bg: 'bg-purple-100', text: 'text-purple-700', icon: RefreshCw, label: 'Reembolsado' };
            case 'expired':
                return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock, label: 'Expirado' };
            case 'cancelled':
                return { bg: 'bg-slate-100', text: 'text-slate-700', icon: XCircle, label: 'Cancelado' };
            default:
                return { bg: 'bg-slate-100', text: 'text-slate-700', icon: AlertCircle, label: status };
        }
    };

    const stats = {
        total: payments.length,
        approved: payments.filter(p => p.status === 'approved').length,
        pending: payments.filter(p => p.status === 'pending').length,
        totalAmount: payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0)
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Histórico de Pagamentos</h2>
                    <p className="text-slate-500 text-sm mt-1">Acompanhe todas as suas transações</p>
                </div>
                <button
                    onClick={loadPayments}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                    title="Atualizar"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Total de Transações</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Aprovadas</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500">Total Pago</p>
                    <p className="text-2xl font-bold text-indigo-600">R$ {stats.totalAmount.toFixed(2)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { key: 'all', label: 'Todos' },
                    { key: 'approved', label: 'Aprovados' },
                    { key: 'pending', label: 'Pendentes' },
                    { key: 'rejected', label: 'Rejeitados' },
                    { key: 'refunded', label: 'Reembolsados' }
                ].map(filter => (
                    <button
                        key={filter.key}
                        onClick={() => setFilterStatus(filter.key as FilterStatus)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${filterStatus === filter.key
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Payment List */}
            {filteredPayments.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum pagamento encontrado</h3>
                    <p className="text-slate-500">
                        {filterStatus === 'all'
                            ? 'Você ainda não realizou nenhum pagamento.'
                            : `Nenhum pagamento com status "${getStatusStyle(filterStatus).label}".`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredPayments.map(payment => {
                        const statusStyle = getStatusStyle(payment.status);
                        const StatusIcon = statusStyle.icon;

                        return (
                            <div
                                key={payment.id}
                                onClick={() => setSelectedPayment(payment)}
                                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Method Icon */}
                                    <div className={`p-3 rounded-xl ${statusStyle.bg}`}>
                                        {getMethodIcon(payment.method)}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-800 truncate">
                                                {payment.description || 'Pagamento'}
                                            </p>
                                            {payment.method === 'credit_card' && payment.cardBrand && (
                                                <span className="text-xs text-slate-500">
                                                    {payment.cardBrand} •••• {payment.cardLastDigits}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {new Date(payment.createdAt).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs text-slate-500">{getMethodLabel(payment.method)}</span>
                                        </div>
                                    </div>

                                    {/* Amount & Status */}
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">R$ {payment.amount.toFixed(2)}</p>
                                        {payment.installments && payment.installments > 1 && (
                                            <p className="text-xs text-slate-500">
                                                {payment.installments}x de R$ {payment.installmentValue?.toFixed(2)}
                                            </p>
                                        )}
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${statusStyle.bg} ${statusStyle.text}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusStyle.label}
                                        </span>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </div>
    );
};

// =====================================================
// PAYMENT DETAIL MODAL
// =====================================================

interface PaymentDetailModalProps {
    payment: Payment;
    onClose: () => void;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ payment, onClose }) => {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'approved':
                return { bg: 'bg-green-100', text: 'text-green-700', label: 'Aprovado' };
            case 'pending':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' };
            case 'rejected':
                return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeitado' };
            case 'refunded':
                return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Reembolsado' };
            default:
                return { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
        }
    };

    const statusStyle = getStatusStyle(payment.status);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-200 text-sm">Detalhes do Pagamento</p>
                            <p className="text-2xl font-bold mt-1">R$ {payment.amount.toFixed(2)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-500">Método</p>
                            <p className="font-medium text-slate-800 capitalize">{payment.method.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Data</p>
                            <p className="font-medium text-slate-800">
                                {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        {payment.cardBrand && (
                            <>
                                <div>
                                    <p className="text-xs text-slate-500">Cartão</p>
                                    <p className="font-medium text-slate-800">{payment.cardBrand} •••• {payment.cardLastDigits}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Parcelas</p>
                                    <p className="font-medium text-slate-800">
                                        {payment.installments}x de R$ {payment.installmentValue?.toFixed(2)}
                                    </p>
                                </div>
                            </>
                        )}
                        {payment.paidAt && (
                            <div>
                                <p className="text-xs text-slate-500">Pago em</p>
                                <p className="font-medium text-slate-800">
                                    {new Date(payment.paidAt).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>

                    {payment.description && (
                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500">Descrição</p>
                            <p className="font-medium text-slate-800">{payment.description}</p>
                        </div>
                    )}

                    {payment.externalId && (
                        <div className="pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500">ID da Transação</p>
                            <p className="font-mono text-sm text-slate-600">{payment.externalId}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistory;
