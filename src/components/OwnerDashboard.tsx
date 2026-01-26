
import React, { useState, useEffect } from 'react';
import { Car, User, Rental } from '../types';
import { analyzeCarListing } from '../services/geminiService';
import { getActiveRentals, completeRental } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sparkles, Plus, Car as CarIcon, DollarSign, Loader2, Upload, Pencil, RotateCcw, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OwnerDashboardProps {
  user: User;
  myCars: Car[];
  onAddCar: (car: Omit<Car, 'id'>) => void;
  onUpdateCar: (car: Car) => void;
  onCarReturned: (carId: string | number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MOCK_EARNINGS_DATA = [
  { name: 'Jan', earnings: 1200 },
  { name: 'Fev', earnings: 1900 },
  { name: 'Mar', earnings: 1500 },
  { name: 'Abr', earnings: 2200 },
  { name: 'Mai', earnings: 2800 },
  { name: 'Jun', earnings: 2400 },
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, myCars, onAddCar, onUpdateCar, onCarReturned, showToast }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState<Car['category']>('Sedan');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadActiveRentals();
  }, [user.id]);

  const loadActiveRentals = async () => {
    const rentals = await getActiveRentals(user.id);
    setActiveRentals(rentals);
  };

  const startEditing = (car: Car) => {
    setEditingCar(car);
    setMake(car.make);
    setModel(car.model);
    setYear(car.year);
    setCategory(car.category);
    setPrice(car.pricePerDay);
    setDescription(car.description);
    setFeatures(car.features);
    setIsAdding(true);
    setImageFile(null);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCar(null);
    resetForm();
  };

  const resetForm = () => {
    setMake(''); setModel(''); setDescription(''); setPrice(0); setImageFile(null); setFeatures([]);
  };

  const handleAIAnalysis = async () => {
    if (!make || !model) {
      showToast("Preencha Marca e Modelo para a IA analisar.", 'error');
      return;
    }
    setLoadingAI(true);
    const result = await analyzeCarListing(make, model, year, category);
    setPrice(result.suggestedPrice);
    setDescription(result.marketingDescription);
    setFeatures(result.features);
    setLoadingAI(false);
    showToast("IA preencheu os campos!", 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalImageUrl = editingCar ? editingCar.imageUrl : `https://picsum.photos/400/300?random=${Math.random()}`;

    if (imageFile) {
      setUploading(true);
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cars')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('cars')
          .getPublicUrl(filePath);

        finalImageUrl = data.publicUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Falha no upload da imagem. Usando padrão.', 'error');
      } finally {
        setUploading(false);
      }
    }

    if (editingCar) {
      const updatedCar: Car = {
        ...editingCar,
        make, model, year, category, pricePerDay: price, description, imageUrl: finalImageUrl, features,
      };
      onUpdateCar(updatedCar);
      showToast("Veículo atualizado!", 'success');
    } else {
      const newCar: Omit<Car, 'id'> = {
        ownerId: user.id,
        make,
        model,
        year,
        category,
        pricePerDay: price,
        description,
        imageUrl: finalImageUrl,
        features,
        isAvailable: true,
      };
      onAddCar(newCar);
      showToast("Veículo cadastrado!", 'success');
    }

    handleCancel();
  };

  const handleReturnCar = async (rental: Rental) => {
    if (!confirm(`Confirmar devolução do veículo?`)) return;

    try {
      await completeRental(rental.id, rental.carId);
      setActiveRentals(activeRentals.filter(r => r.id !== rental.id));
      onCarReturned(rental.carId);
      showToast("Veículo devolvido e disponível novamente!", 'success');
    } catch (e) {
      showToast("Erro ao processar devolução.", 'error');
    }
  };

  // Find car by rental
  const getCarForRental = (rental: Rental) => {
    return myCars.find(c => String(c.id) === String(rental.carId));
  };

  if (isAdding) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingCar ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
          </h2>
          <button onClick={handleCancel} className="text-slate-500 hover:text-slate-700">Cancelar</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
              <input type="text" value={make} onChange={e => setMake(e.target.value)} className="w-full p-2 border rounded-md" placeholder="Ex: Honda" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full p-2 border rounded-md" placeholder="Ex: Civic" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ano</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value as Car['category'])} className="w-full p-2 border rounded-md">
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Luxury">Luxo</option>
                <option value="Sports">Esportivo</option>
              </select>
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Assistente IA
              </h3>
              <button
                type="button"
                onClick={handleAIAnalysis}
                disabled={loadingAI}
                className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-700 transition flex items-center gap-2"
              >
                {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Sugerir Preço e Descrição
              </button>
            </div>
            <p className="text-xs text-indigo-700">A IA analisa o mercado e sugere preço, descrição e características.</p>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Foto do Veículo {editingCar && '(Deixe vazio para manter)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            />
            {imageFile && <p className="text-xs text-green-600 mt-2 font-medium">Selecionado: {imageFile.name}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço/Dia (R$)</label>
              <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full p-2 border rounded-md font-bold text-lg text-green-700" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Características (vírgula)</label>
              <input type="text" value={features.join(', ')} onChange={e => setFeatures(e.target.value.split(',').map(s => s.trim()))} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border rounded-md" required></textarea>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition font-semibold disabled:opacity-50 flex justify-center"
          >
            {uploading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</> : (editingCar ? 'Salvar Alterações' : 'Cadastrar Veículo')}
          </button>
        </form>
      </div>
    );
  }

  const rentedCars = myCars.filter(c => !c.isAvailable);
  const availableCars = myCars.filter(c => c.isAvailable);

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Faturado</p>
              <p className="text-2xl font-bold text-slate-900">R$ 12.450</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Meus Carros</p>
              <p className="text-2xl font-bold text-slate-900">{myCars.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CarIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Alugados Agora</p>
              <p className="text-2xl font-bold text-orange-600">{rentedCars.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center justify-center border-slate-200">
          <button
            onClick={() => { setEditingCar(null); resetForm(); setIsAdding(true); }}
            className="w-full h-full min-h-[50px] flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Carro
          </button>
        </div>
      </div>

      {/* Active Rentals Alert */}
      {activeRentals.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Aluguéis em Andamento ({activeRentals.length})</h3>
          </div>
          <div className="space-y-2">
            {activeRentals.map(rental => {
              const car = getCarForRental(rental);
              return (
                <div key={rental.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">{car ? `${car.make} ${car.model}` : 'Carro'}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(rental.startDate).toLocaleDateString('pt-BR')} até {new Date(rental.endDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReturnCar(rental)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Devolver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Desempenho Financeiro</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_EARNINGS_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="earnings" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* My Cars List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Minha Frota</h3>
        {myCars.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
            <CarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Você ainda não tem veículos cadastrados.</p>
            <button onClick={() => setIsAdding(true)} className="mt-4 text-indigo-600 font-medium hover:underline">
              Cadastrar meu primeiro carro
            </button>
          </div>
        ) : (
          myCars.map(car => (
            <div key={car.id} className={`bg-white p-4 rounded-lg border flex gap-4 items-center group relative transition-all ${car.isAvailable ? 'border-slate-200 hover:border-indigo-300' : 'border-orange-200 bg-orange-50/30'}`}>
              <img src={car.imageUrl} alt={car.model} className="w-24 h-24 object-cover rounded-md" />
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">{car.make} {car.model}</h4>
                <p className="text-sm text-slate-500">{car.year} • {car.category}</p>
                <p className="text-sm text-green-600 font-medium">R$ {car.pricePerDay}/dia</p>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {car.isAvailable ? 'Disponível' : 'Alugado'}
                </span>

                <button
                  onClick={() => startEditing(car)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
