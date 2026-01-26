
import React, { useState, useEffect } from 'react';
import { Car, ChatMessage, User } from '../types';
import { getCarRecommendations } from '../services/geminiService';
import { addFavorite, removeFavorite, getFavorites } from '../services/api';
import { Search, MessageCircle, Send, Loader2, Heart, Star } from 'lucide-react';
import { RentModal } from './RentModal';

interface RenterMarketplaceProps {
  cars: Car[];
  currentUser: User;
  onRentCar: (carId: string | number, startDate: string, endDate: string, totalPrice: number) => Promise<void>;
}

export const RenterMarketplace: React.FC<RenterMarketplaceProps> = ({ cars, currentUser, onRentCar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCars, setFilteredCars] = useState<Car[]>(cars);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou seu concierge VeloCity. Diga-me o que você precisa (ex: "Viagem em família para a serra").' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // New states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [currentUser.id]);

  const loadFavorites = async () => {
    const favs = await getFavorites(currentUser.id);
    setFavorites(favs);
  };

  // Sync filteredCars with cars prop
  useEffect(() => {
    applyFilters();
  }, [cars, searchTerm, showFavoritesOnly, favorites]);

  const applyFilters = () => {
    let result = cars;

    // Text filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.make.toLowerCase().includes(lower) ||
        c.model.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower)
      );
    }

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter(c => favorites.includes(String(c.id)));
    }

    setFilteredCars(result);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const toggleFavorite = async (carId: string | number) => {
    const carIdStr = String(carId);
    if (favorites.includes(carIdStr)) {
      await removeFavorite(currentUser.id, carId);
      setFavorites(favorites.filter(f => f !== carIdStr));
    } else {
      await addFavorite(currentUser.id, carId);
      setFavorites([...favorites, carIdStr]);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const recommendedIds = await getCarRecommendations(userMsg, cars);

      if (recommendedIds.length > 0) {
        setFilteredCars(cars.filter(c => recommendedIds.includes(c.id)));
        setChatMessages(prev => [...prev, {
          role: 'model',
          text: `Encontrei ${recommendedIds.length} carros perfeitos para você! Filtrei a lista abaixo.`
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'model',
          text: 'Não encontrei carros exatos com esses critérios, mas dê uma olhada em nossa frota completa.'
        }]);
        setFilteredCars(cars);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema ao processar. Tente novamente.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRentConfirm = async (startDate: string, endDate: string, totalPrice: number) => {
    if (!selectedCar) return;
    await onRentCar(selectedCar.id, startDate, endDate, totalPrice);
    setSelectedCar(null);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por marca, modelo..."
            className="w-full pl-10 pr-4 py-2 border rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${showFavoritesOnly ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
            Favoritos ({favorites.length})
          </button>

          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${showAIChat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <MessageCircle className="w-5 h-5" />
            {showAIChat ? 'Fechar IA' : 'Concierge IA'}
          </button>
        </div>
      </div>

      {/* AI Chat Interface */}
      {showAIChat && (
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in">
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
            <span className="font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5" /> VeloCity Concierge</span>
          </div>
          <div className="h-64 p-4 overflow-y-auto bg-slate-50 space-y-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && <div className="text-slate-400 text-xs italic ml-2">Digitando...</div>}
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Ex: Carro econômico para andar na cidade..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={isChatLoading}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isChatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Car Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCars.map(car => {
          const isFavorite = favorites.includes(String(car.id));

          return (
            <div key={car.id} className={`bg-white rounded-xl overflow-hidden shadow-sm transition border border-slate-200 group ${!car.isAvailable ? 'opacity-60' : 'hover:shadow-lg'}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-800">
                  {car.year}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(car.id); }}
                  className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-slate-400'}`} />
                </button>

                {/* Rating Badge */}
                {car.averageRating && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-slate-800">{car.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{car.make} {car.model}</h3>
                    <p className="text-sm text-slate-500">{car.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-indigo-600">R$ {car.pricePerDay}</p>
                    <p className="text-xs text-slate-400">/dia</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {car.features.slice(0, 3).map((feat, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                      {feat}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-slate-600 mb-4 line-clamp-2 italic">
                  "{car.description}"
                </p>

                <button
                  onClick={() => setSelectedCar(car)}
                  disabled={!car.isAvailable}
                  className={`w-full py-3 rounded-lg font-medium transition
                      ${car.isAvailable
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                >
                  {car.isAvailable ? 'Alugar Agora' : 'Indisponível'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredCars.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            Nenhum carro encontrado. Tente ajustar os filtros ou fale com o Concierge.
          </div>
        )}
      </div>

      {/* Rent Modal */}
      {selectedCar && (
        <RentModal
          car={selectedCar}
          onConfirm={handleRentConfirm}
          onClose={() => setSelectedCar(null)}
        />
      )}
    </div>
  );
};
