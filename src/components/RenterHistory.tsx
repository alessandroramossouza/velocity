
import React, { useState, useEffect } from 'react';
import { Rental, User } from '../types';
import { getRenterHistory } from '../services/api';
import { Calendar, CheckCircle, Clock, Car as CarIcon, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RenterHistoryProps {
    currentUser: User;
}

export const RenterHistory: React.FC<RenterHistoryProps> = ({ currentUser }) => {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [currentUser.id]);

    const loadHistory = async () => {
        setLoading(true);
        // Fetch rent history
        const history = await getRenterHistory(currentUser.id);

        // We need to fetch car details for each rental manually if not joined
        // api.ts getRenterHistory does a simple join locally or relies on DB
        // Let's enhance it here to be safe like we did for Owner

        const enrichedHistory = await Promise.all(history.map(async (rental) => {
            if (rental.carId) {
                const { data: carData } = await supabase.from('cars').select('*').eq('id', rental.carId).single();
                return { ...rental, car: carData };
            }
            return rental;
        }));

        setRentals(enrichedHistory as Rental[]);
        setLoading(false);
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando histórico...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Meus Aluguéis</h2>

            {rentals.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CarIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Nenhum aluguel encontrado</h3>
                    <p className="text-slate-500 mt-2">Você ainda não alugou nenhum carro conosco.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {rentals.map(rental => (
                        <div key={rental.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 ">
                            {/* Car Image (if available) */}
                            <div className="w-full md:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                {rental.car ? (
                                    <img src={rental.car.imageUrl} alt={rental.car.model} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <CarIcon className="w-8 h-8" />
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
                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                            ${rental.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {rental.status === 'active' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                            {rental.status === 'active' ? 'Em Andamento' : 'Concluído'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md">
                                        <Calendar className="w-4 h-4 text-indigo-600" />
                                        <span>
                                            {new Date(rental.startDate).toLocaleDateString('pt-BR')} — {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                        <span className="font-semibold text-slate-900">Total: R$ {rental.totalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
