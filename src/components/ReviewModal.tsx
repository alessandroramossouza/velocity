
import React, { useState } from 'react';
import { Rental, User } from '../types';
import { supabase } from '../lib/supabase';
import { Star, X, Loader2, CheckCircle } from 'lucide-react';

interface ReviewModalProps {
    rental: Rental;
    currentUser: User;
    reviewType: 'renter_to_car' | 'owner_to_renter';
    targetName: string; // Nome do carro ou do locatário
    onSubmit: () => void;
    onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
    rental,
    currentUser,
    reviewType,
    targetName,
    onSubmit,
    onClose
}) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Por favor, selecione uma avaliação.');
            return;
        }

        setSubmitting(true);

        try {
            const reviewData = {
                rental_id: rental.id,
                renter_id: currentUser.id,
                reviewer_type: reviewType,
                rating,
                comment,
                car_id: reviewType === 'renter_to_car' ? rental.carId : null,
                reviewed_user_id: reviewType === 'owner_to_renter' ? rental.renterId : null
            };

            const { error } = await supabase
                .from('reviews')
                .insert(reviewData);

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                onSubmit();
            }, 1500);
        } catch (err) {
            console.error('Review error:', err);
            alert('Erro ao enviar avaliação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Avaliação Enviada!</h2>
                    <p className="text-slate-500">Obrigado pelo seu feedback.</p>
                </div>
            </div>
        );
    }

    const starLabels = ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold">Avaliar {reviewType === 'renter_to_car' ? 'Veículo' : 'Locatário'}</h2>
                            <p className="text-yellow-100 text-sm mt-1">{targetName}</p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Star Rating */}
                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-3">Como foi sua experiência?</p>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="transition transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-10 h-10 ${star <= (hoverRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-slate-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                        {(hoverRating || rating) > 0 && (
                            <p className="text-sm font-medium text-slate-700 mt-2">
                                {starLabels[(hoverRating || rating) - 1]}
                            </p>
                        )}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Comentário (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            placeholder={
                                reviewType === 'renter_to_car'
                                    ? 'Como foi o carro? Algum problema?'
                                    : 'Como foi a experiência com este locatário?'
                            }
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                        />
                    </div>

                    {/* Quick Tags */}
                    {reviewType === 'renter_to_car' ? (
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Tags rápidas:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Limpo', 'Confortável', 'Econômico', 'Bem conservado', 'Ótimo dono'].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => setComment(prev => prev ? `${prev}, ${tag}` : tag)}
                                        className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-slate-500 mb-2">Tags rápidas:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Pontual', 'Cuidadoso', 'Devolveu limpo', 'Boa comunicação', 'Recomendo'].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => setComment(prev => prev ? `${prev}, ${tag}` : tag)}
                                        className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-indigo-100 hover:text-indigo-700 transition"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition"
                        >
                            Pular
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || rating === 0}
                            className="flex-1 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
