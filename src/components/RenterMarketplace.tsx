
import React, { useState, useEffect } from 'react';
import { Car, ChatMessage, User } from '../types';
import { getCarRecommendations } from '../services/geminiService';
import { addFavorite, removeFavorite, getFavorites } from '../services/api';
import {
  Search, MessageCircle, Send, Loader2, Heart, Star, Share2, Copy, Check,
  ArrowUpDown, Filter, X, Car as CarIcon, Sparkles
} from 'lucide-react';
import { RentModal } from './RentModal';

interface RenterMarketplaceProps {
  cars: Car[];
  currentUser: User;
  onRentCar: (carId: string | number, startDate: string, endDate: string, totalPrice: number) => Promise<void>;
}

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'rating';

export const RenterMarketplace: React.FC<RenterMarketplaceProps> = ({ cars, currentUser, onRentCar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCars, setFilteredCars] = useState<Car[]>(cars);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou seu concierge VeloCity. Diga-me o que você precisa (ex: "Viagem em família para a serra").' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Enhanced states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [shareCarId, setShareCarId] = useState<string | number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = ['SUV', 'Sedan', 'Hatchback', 'Luxury', 'Sports'];

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
  }, [cars, searchTerm, showFavoritesOnly, favorites, sortBy, selectedCategory]);

  const applyFilters = () => {
    let result = [...cars];

    // Text filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.make.toLowerCase().includes(lower) ||
        c.model.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(c => c.category === selectedCategory);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter(c => favorites.includes(String(c.id)));
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.pricePerDay - b.pricePerDay);
        break;
      case 'price_desc':
        result.sort((a, b) => b.pricePerDay - a.pricePerDay);
        break;
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'recent':
      default:
        // Keep original order (newest first assumed)
        break;
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

  const handleShare = async (car: Car) => {
    const shareUrl = `${window.location.origin}/car/${car.id}`;
    const shareText = `Confira esse ${car.make} ${car.model} no VeloCity! A partir de R$${car.pricePerDay}/dia`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${car.make} ${car.model} - VeloCity`,
          text: shareText,
          url: shareUrl
        });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      setShareCarId(car.id);
    }
  };

  const copyShareLink = (carId: string | number) => {
    const shareUrl = `${window.location.origin}/car/${carId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShareCarId(null);
    }, 2000);
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Mais Recentes' },
    { value: 'price_asc', label: 'Menor Preço' },
    { value: 'price_desc', label: 'Maior Preço' },
    { value: 'rating', label: 'Melhor Avaliação' }
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="hover:text-indigo-600 cursor-pointer transition">Home</span>
        <span>›</span>
        <span className="hover:text-indigo-600 cursor-pointer transition">Marketplace</span>
        {selectedCategory && (
          <>
            <span>›</span>
            <span className="text-indigo-600 font-medium">{selectedCategory}</span>
          </>
        )}
      </div>

      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por marca, modelo..."
              className="w-full pl-10 pr-4 py-2 border rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  {sortOptions.find(o => o.value === sortBy)?.label}
                </span>
              </button>

              {showSortMenu && (
                <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden animate-fade-in">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition hover:bg-slate-50 ${sortBy === opt.value ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${showFavoritesOnly ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              <span className="text-sm font-medium hidden sm:inline">Favoritos ({favorites.length})</span>
            </button>

            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition ${showAIChat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">{showAIChat ? 'Fechar IA' : 'Concierge IA'}</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${!selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* AI Chat Interface */}
      {showAIChat && (
        <div className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
            <span className="font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5" /> VeloCity Concierge</span>
            <button onClick={() => setShowAIChat(false)} className="p-1 hover:bg-white/20 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
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

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          {filteredCars.length} veículo{filteredCars.length !== 1 ? 's' : ''} encontrado{filteredCars.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Car Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCars.map(car => {
          const isFavorite = favorites.includes(String(car.id));

          return (
            <div key={car.id} className={`bg-white rounded-xl overflow-hidden shadow-sm transition border border-slate-200 group ${!car.isAvailable ? 'opacity-60' : 'hover:shadow-lg hover:-translate-y-1'}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />

                {/* Year Badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-slate-800">
                  {car.year}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(car.id); }}
                  className="absolute top-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition"
                >
                  <Heart className={`w-5 h-5 transition ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-slate-400'}`} />
                </button>

                {/* Share Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(car); }}
                  className="absolute top-3 left-14 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:scale-110 transition opacity-0 group-hover:opacity-100"
                >
                  <Share2 className="w-5 h-5 text-slate-500" />
                </button>

                {/* Rating Badge */}
                {car.averageRating && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-slate-800">{car.averageRating.toFixed(1)}</span>
                  </div>
                )}

                {/* Availability Status */}
                <div className={`absolute bottom-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {car.isAvailable ? 'Disponível' : 'Indisponível'}
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{car.make} {car.model}</h3>
                    <p className="text-sm text-slate-500">{car.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">a partir de</p>
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
                  {car.features.length > 3 && (
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                      +{car.features.length - 3}
                    </span>
                  )}
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

        {/* Empty State */}
        {filteredCars.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-16 px-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <CarIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum veículo encontrado</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                {showFavoritesOnly
                  ? 'Você ainda não tem nenhum favorito. Explore o marketplace e adicione carros que você gosta!'
                  : 'Tente ajustar os filtros ou fale com nosso Concierge IA para encontrar o carro perfeito.'}
              </p>
              <div className="flex gap-3 justify-center">
                {showFavoritesOnly && (
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition"
                  >
                    Ver Todos os Carros
                  </button>
                )}
                {!showFavoritesOnly && (
                  <button
                    onClick={() => setShowAIChat(true)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Falar com Concierge
                  </button>
                )}
                {(searchTerm || selectedCategory) && (
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                    className="px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-medium hover:bg-slate-300 transition"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareCarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShareCarId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              Compartilhar Veículo
            </h3>
            <div className="flex gap-3 mb-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Confira esse carro no VeloCity! ${window.location.origin}/car/${shareCarId}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium text-center hover:bg-green-600 transition"
              >
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/car/${shareCarId}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition"
              >
                Facebook
              </a>
            </div>
            <button
              onClick={() => copyShareLink(shareCarId)}
              className="w-full py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              {copiedLink ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>
      )}

      {/* Rent Modal */}
      {selectedCar && (
        <RentModal
          car={selectedCar}
          currentUser={currentUser}
          onConfirm={handleRentConfirm}
          onClose={() => setSelectedCar(null)}
          onNeedKYC={() => {
            setSelectedCar(null);
            alert('Por favor, verifique sua identidade primeiro. Clique no seu perfil.');
          }}
        />
      )}
    </div>
  );
};
