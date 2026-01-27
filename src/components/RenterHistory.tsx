
import React, { useState, useEffect } from 'react';
import { Rental, User, Review } from '../types';
import { getRenterHistory } from '../services/api';
import {
    Calendar, CheckCircle, Clock, Car as CarIcon, DollarSign, Star, XCircle,
    Repeat, ChevronRight, MessageSquare, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RenterHistoryProps {
    currentUser: User;
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RenterHistory: React.FC<RenterHistoryProps> = ({ currentUser, showToast }) => {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

    // Review modal state
    const [reviewModal, setReviewModal] = useState<Rental | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [existingReviews, setExistingReviews] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadHistory();
    }, [currentUser.id]);

    const loadHistory = async () => {
        setLoading(true);
        const history = await getRenterHistory(currentUser.id);

        // Enrich with car data
        const enrichedHistory = await Promise.all(history.map(async (rental) => {
            if (rental.carId) {
                const { data: carData } = await supabase.from('cars').select('*').eq('id', rental.carId).single();
                return { ...rental, car: carData };
            }
            return rental;
        }));

        setRentals(enrichedHistory as Rental[]);

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

        setLoading(false);
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
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                {[
                    { key: 'all', label: 'Todos', count: rentals.length },
                    { key: 'active', label: 'Em Andamento', count: activeCount },
                    { key: 'completed', label: 'Concluídos', count: completedCount }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Rental List */}
            {filteredRentals.length === 0 ? (
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
