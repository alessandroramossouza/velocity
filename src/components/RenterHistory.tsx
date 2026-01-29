
import React, { useState, useEffect } from 'react';
import { Rental, User, Review } from '../types';
import { getRenterHistory, getRenterProposals, signProposalContract, confirmProposalPayment, getRentalInstallments, payInstallment, generateWeeklyInstallments } from '../services/api';
import {
    Calendar, CheckCircle, Clock, Car as CarIcon, DollarSign, Star, XCircle,
    Repeat, ChevronRight, MessageSquare, Loader2, FileText, CreditCard, ArrowRight, Download, PenTool, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ContractSignatureModal } from './ContractSignatureModal';
import { PaymentModal } from './PaymentModal';

interface RenterHistoryProps {
    currentUser: User;
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RenterHistory: React.FC<RenterHistoryProps> = ({ currentUser, showToast }) => {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [proposals, setProposals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'proposals'>('proposals');

    // Action Modals
    const [signingRental, setSigningRental] = useState<Rental | null>(null);
    const [payingRental, setPayingRental] = useState<Rental | null>(null);

    // Review modal state
    const [reviewModal, setReviewModal] = useState<Rental | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [existingReviews, setExistingReviews] = useState<Record<string, boolean>>({});
    const [installmentsMap, setInstallmentsMap] = useState<Record<string, any[]>>({});

    useEffect(() => {
        loadHistory();
    }, [currentUser.id]);

    const loadHistory = async () => {
        setLoading(true);
        const [history, proposalsData] = await Promise.all([
            getRenterHistory(currentUser.id),
            getRenterProposals(currentUser.id)
        ]);

        // Enrich with car data
        const enrichList = async (list: Rental[]) => {
            return Promise.all(list.map(async (rental) => {
                if (rental.carId && !rental.car) {
                    const { data: carData } = await supabase.from('cars').select('*').eq('id', rental.carId).single();
                    return { ...rental, car: carData };
                }
                return rental;
            }));
        };

        const enrichedHistory = await enrichList(history);
        const enrichedProposals = await enrichList(proposalsData);

        // Fetch installments for active rentals AND proposals
        const installMap: Record<string, any[]> = {};
        const allRentalsToCheck = [...enrichedHistory, ...enrichedProposals];

        for (const rental of allRentalsToCheck) {
            if (['active', 'payment_pending'].includes(rental.status)) {
                const installments = await getRentalInstallments(rental.id);
                if (installments.length > 0) {
                    installMap[rental.id] = installments;
                }
            }
        }
        setInstallmentsMap(installMap);

        // Check existing reviews
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rental_id')
            .eq('reviewer_id', currentUser.id);

        if (reviews) {
            const reviewMap: Record<string, boolean> = {};
            reviews.forEach(r => { reviewMap[r.rental_id] = true; });
            setExistingReviews(reviewMap);
        }

        setRentals(enrichedHistory);
        setProposals(enrichedProposals);
        setLoading(false);
    };

    const handleGenerateWeekly = async (rental: Rental) => {
        try {
            await generateWeeklyInstallments(rental);
            showToast?.('Plano semanal gerado com sucesso!', 'success');
            loadHistory(); // Refresh to see the new installments
        } catch (error) {
            showToast?.('Erro ao gerar plano semanal.', 'error');
        }
    };

    const filteredRentals = rentals.filter(r => {
        if (activeTab === 'active') return r.status === 'active';
        if (activeTab === 'completed') return r.status === 'completed';
        return true;
    });

    const handleSubmitReview = async () => {
        if (!reviewModal) return;
        setSubmittingReview(true);

        const { error } = await supabase.from('reviews').insert({
            rental_id: reviewModal.id,
            car_id: reviewModal.carId,
            reviewer_id: currentUser.id,
            reviewer_type: 'renter_to_car',
            rating: reviewRating,
            comment: reviewComment,
            created_at: new Date().toISOString()
        });

        if (error) {
            showToast?.('Erro ao enviar avaliação.', 'error');
        } else {
            showToast?.('Avaliação enviada com sucesso!', 'success');
            setExistingReviews(prev => ({ ...prev, [reviewModal.id]: true }));
        }

        setSubmittingReview(false);
        setReviewModal(null);
        setReviewRating(5);
        setReviewComment('');
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'cancelled':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'payment_pending':
                return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <Clock className="w-4 h-4" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4" />;
            case 'payment_pending':
                return <DollarSign className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return 'Em Andamento';
            case 'completed':
                return 'Concluído';
            case 'cancelled':
                return 'Cancelado';
            case 'payment_pending':
                return 'Pagamento Pendente';
            default:
                return status;
        }
    };

    // Stats
    const totalSpent = rentals.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.totalPrice, 0);
    const activeCount = rentals.filter(r => r.status === 'active').length;
    const completedCount = rentals.filter(r => r.status === 'completed').length;

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
                    <h2 className="text-2xl font-bold text-slate-800">Meus Aluguéis</h2>
                    <p className="text-slate-500 text-sm mt-1">Histórico completo de suas locações</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total de Aluguéis</p>
                            <p className="text-2xl font-bold text-slate-800">{rentals.length}</p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-full">
                            <CarIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Em Andamento</p>
                            <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total Investido</p>
                            <p className="text-2xl font-bold text-green-600">R$ {totalSpent.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {[
                    { key: 'proposals', label: 'Solicitações', count: proposals.length },
                    { key: 'active', label: 'Em Andamento', count: activeCount },
                    { key: 'completed', label: 'Concluídos', count: completedCount },
                    { key: 'all', label: 'Todos', count: rentals.length }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === tab.key
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'proposals' && (
                <div className="space-y-6">
                    {proposals.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">Nenhuma solicitação em andamento.</p>
                        </div>
                    ) : (
                        proposals.map(proposal => {
                            // Determine active step
                            let step = 1;
                            if (proposal.status === 'contract_pending_signature') step = 2;
                            if (proposal.status === 'contract_signed') step = 3;
                            if (proposal.status === 'payment_pending') step = 4;

                            const hasInstallments = installmentsMap[proposal.id] && installmentsMap[proposal.id].length > 0;
                            const firstInstallment = hasInstallments ? installmentsMap[proposal.id].find((i: any) => i.installmentNumber === 1) : null;

                            return (
                                <div key={proposal.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{proposal.car?.make} {proposal.car?.model}</h3>
                                                <p className="text-sm text-slate-500">Solicitação iniciada em {new Date(proposal.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                                                Processo de Aprovação
                                            </span>
                                        </div>

                                        {/* Stepper */}
                                        <div className="relative flex items-center justify-between mb-8 px-4">
                                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
                                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>

                                            {[
                                                { id: 1, label: 'Proposta', icon: MessageSquare },
                                                { id: 2, label: 'Contrato', icon: FileText },
                                                { id: 3, label: 'Aprovação', icon: CheckCircle },
                                                { id: 4, label: 'Pagamento', icon: CreditCard }
                                            ].map((s) => {
                                                const isActive = step >= s.id;
                                                const isCurrent = step === s.id;
                                                const Icon = s.icon;
                                                return (
                                                    <div key={s.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <span className={`text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{s.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Action Area */}
                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {step === 1 && 'Aguardando revisão do Locador'}
                                                    {step === 2 && 'O Locador enviou o contrato'}
                                                    {step === 3 && 'Contrato assinado. Aguardando Locador.'}
                                                    {step === 4 && 'Pagamento Liberado! Escolha como pagar.'}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {step === 1 && 'O locador está analisando sua proposta.'}
                                                    {step === 2 && 'Por favor, revise e assine o contrato para prosseguir.'}
                                                    {step === 3 && 'O locador irá verificar sua assinatura e liberar o pagamento.'}
                                                    {step === 4 && 'Você pode optar por pagar o total ou parcelar semanalmente.'}
                                                </p>
                                            </div>

                                            {step === 2 && (
                                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                                    {(proposal.contractUrl || proposal.car?.contractPdfUrl) && (
                                                        <button
                                                            onClick={() => setSigningRental(proposal)}
                                                            className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 hover:border-slate-400 transition"
                                                            title="Visualizar a minuta do contrato com seus dados"
                                                        >
                                                            <Eye className="w-4 h-4 text-indigo-600" />
                                                            Visualizar Contrato
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSigningRental(proposal)}
                                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-indigo-200 shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <PenTool className="w-4 h-4" />
                                                        Assinar Contrato
                                                    </button>
                                                </div>
                                            )}

                                            {step === 4 && (
                                                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                                                    <button
                                                        onClick={() => {
                                                            // Calculate weekly amount if not exists
                                                            let weeklyAmt = 0;
                                                            if (hasInstallments && firstInstallment) {
                                                                weeklyAmt = firstInstallment.amount;
                                                            } else {
                                                                // Estimate
                                                                const startDate = new Date(proposal.startDate);
                                                                const endDate = new Date(proposal.endDate);
                                                                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                const weeks = Math.ceil(diffDays / 7) || 1;
                                                                weeklyAmt = proposal.totalPrice / weeks;
                                                            }

                                                            setPayingRental({
                                                                ...proposal,
                                                                _paymentOptions: [
                                                                    {
                                                                        id: 'monthly',
                                                                        label: 'Pagamento Mensal',
                                                                        amount: proposal.totalPrice,
                                                                        description: `Pagamento Total: ${proposal.car?.make} ${proposal.car?.model}`,
                                                                        recommended: true
                                                                    },
                                                                    {
                                                                        id: 'weekly',
                                                                        label: 'Pagamento Semanal',
                                                                        amount: weeklyAmt,
                                                                        description: `Parcela Semanal: ${proposal.car?.make} ${proposal.car?.model}`,
                                                                        tag: 'Flexível'
                                                                    }
                                                                ]
                                                            } as any);
                                                        }}
                                                        className="bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-green-200 shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                                                    >
                                                        <CreditCard className="w-5 h-5" />
                                                        Realizar Pagamento
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {signingRental && (
                <ContractSignatureModal
                    isOpen={true}
                    onClose={() => setSigningRental(null)}
                    rental={signingRental}
                    car={signingRental.car as any}
                    user={currentUser}
                    onSuccess={async (url) => {
                        await signProposalContract(signingRental.id, url);
                        showToast?.('Contrato assinado com sucesso!', 'success');
                        setSigningRental(null);
                        loadHistory();
                    }}
                />
            )}

            {payingRental && (
                <PaymentModal
                    isOpen={true}
                    onClose={() => setPayingRental(null)}
                    userId={currentUser.id}
                    amount={payingRental.totalPrice} // Default, overridden by options
                    description={`Pagamento: ${(payingRental as any).car?.make}`}
                    rentalId={payingRental.id}
                    receiverId={payingRental.ownerId}
                    paymentOptions={(payingRental as any)._paymentOptions} // Pass the options
                    onSuccess={async (payment) => {
                        // Check which option was selected via Metadata or inferred amount
                        const isWeekly = (payingRental as any)._paymentOptions?.find((o: any) => o.id === 'weekly')?.amount === payment.amount;

                        // Or check metaData if we added it to the payment object in PaymentModal (we passed it to create fn, but might not be returned in simple obj)
                        // Inference by amount is safe enough here.

                        if (isWeekly) {
                            // Ensure installments exist
                            let installments = installmentsMap[payingRental.id];
                            if (!installments || installments.length === 0) {
                                await generateWeeklyInstallments(payingRental);
                                installments = await getRentalInstallments(payingRental.id);
                            }

                            // Find first pending
                            const pending = installments.find((i: any) => i.status === 'pending');
                            if (pending) {
                                await payInstallment(pending.id);
                                showToast?.('Parcela semanal paga com sucesso!', 'success');
                            } else {
                                showToast?.('Pagamento recebido (Semanal)', 'success');
                            }

                        } else {
                            await confirmProposalPayment(payingRental.id);
                            showToast?.('Pagamento mensal realizado com sucesso!', 'success');
                        }

                        setPayingRental(null);
                        loadHistory();
                        setActiveTab('active');
                    }}
                />
            )}

            {/* Rental List (Active/Completed/All) */}
            {activeTab !== 'proposals' && filteredRentals.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CarIcon className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum aluguel encontrado</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {activeTab === 'active'
                            ? 'Você não tem aluguéis em andamento no momento.'
                            : activeTab === 'completed'
                                ? 'Você ainda não finalizou nenhum aluguel.'
                                : 'Você ainda não alugou nenhum carro conosco. Explore o Marketplace!'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRentals.map(rental => (
                        <div key={rental.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Car Image */}
                                <div className="w-full md:w-40 h-28 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {rental.car ? (
                                        <img src={rental.car.imageUrl} alt={rental.car.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <CarIcon className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                {rental.car ? `${rental.car.make} ${rental.car.model}` : 'Carro Indisponível'}
                                            </h3>
                                            <p className="text-sm text-slate-500">{rental.car?.category} • {rental.car?.year}</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${getStatusStyle(rental.status)}`}>
                                            {getStatusIcon(rental.status)}
                                            {getStatusLabel(rental.status)}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                            <Calendar className="w-4 h-4 text-indigo-600" />
                                            <span className="text-slate-700">
                                                {new Date(rental.startDate).toLocaleDateString('pt-BR')} — {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                                            <DollarSign className="w-4 h-4 text-green-600" />
                                            <span className="font-semibold text-green-700">R$ {rental.totalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Installments / Weekly Payments Display */}
                                {installmentsMap[rental.id] && installmentsMap[rental.id].length > 0 && (
                                    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-indigo-600" />
                                                Pagamento Semanal
                                            </h4>
                                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                Motorista App
                                            </span>
                                        </div>

                                        {(() => {
                                            const installments = installmentsMap[rental.id];
                                            const pending = installments.find((i: any) => i.status === 'pending');
                                            const nextDue = pending;
                                            // Calculate progress
                                            const paidCount = installments.filter((i: any) => i.status === 'paid').length;
                                            const totalCount = installments.length;
                                            const percent = (paidCount / totalCount) * 100;

                                            // Alert Logic
                                            let alert = null;
                                            if (nextDue) {
                                                const daysUntil = Math.ceil((new Date(nextDue.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                                if (daysUntil < 0) alert = <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded flex items-center gap-1 animate-pulse"><XCircle className="w-3 h-3" /> Atrasado!</span>;
                                                else if (daysUntil <= 3) alert = <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded flex items-center gap-1"><Clock className="w-3 h-3" /> Vence em {daysUntil} dias</span>;
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    {/* Progress Bar */}
                                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                        <span>Progresso: {paidCount}/{totalCount} semanas</span>
                                                        <span>{Math.round(percent)}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                    </div>

                                                    {nextDue ? (
                                                        <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 shadow-sm mt-3">
                                                            <div>
                                                                <p className="text-xs text-slate-500 font-semibold uppercase">Próximo Pagamento</p>
                                                                <p className="font-bold text-slate-800 text-lg">R$ {nextDue.amount.toFixed(2)}</p>
                                                                <p className="text-xs text-slate-500">Vence em: {new Date(nextDue.dueDate).toLocaleDateString()}</p>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end gap-2">
                                                                {alert}
                                                                <button
                                                                    onClick={() => setPayingRental({ ...rental, customPayment: nextDue } as any)}
                                                                    className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm"
                                                                >
                                                                    Pagar Parcela {nextDue.installmentNumber}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-2 text-green-600 font-bold text-sm bg-green-50 rounded border border-green-100">
                                                            Todas as parcelas quitadas! 🎉
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-4 flex gap-2">
                                    {rental.status === 'completed' && !existingReviews[rental.id] && (
                                        <button
                                            onClick={() => setReviewModal(rental)}
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition text-sm"
                                        >
                                            <Star className="w-4 h-4" />
                                            Avaliar
                                        </button>
                                    )}
                                    {rental.status === 'completed' && existingReviews[rental.id] && (
                                        <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Avaliado
                                        </span>
                                    )}
                                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition text-sm">
                                        <Repeat className="w-4 h-4" />
                                        Alugar Novamente
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setReviewModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Avaliar Veículo</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {reviewModal.car?.make} {reviewModal.car?.model}
                        </p>

                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    className="p-1 transition hover:scale-110"
                                >
                                    <Star
                                        className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Comment */}
                        <textarea
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="Conte como foi sua experiência..."
                            rows={4}
                            className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setReviewModal(null)}
                                className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                disabled={submittingReview}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                                Enviar Avaliação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

