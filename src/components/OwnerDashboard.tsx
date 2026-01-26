import React, { useState } from 'react';
import { Car, User } from '../types';
import { analyzeCarListing } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sparkles, Plus, Car as CarIcon, DollarSign, Loader2 } from 'lucide-react';

interface OwnerDashboardProps {
  user: User;
  myCars: Car[];
  onAddCar: (car: Omit<Car, 'id'>) => void;
}

const MOCK_EARNINGS_DATA = [
  { name: 'Jan', earnings: 1200 },
  { name: 'Fev', earnings: 1900 },
  { name: 'Mar', earnings: 1500 },
  { name: 'Abr', earnings: 2200 },
  { name: 'Mai', earnings: 2800 },
  { name: 'Jun', earnings: 2400 },
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, myCars, onAddCar }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState<Car['category']>('Sedan');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  const handleAIAnalysis = async () => {
    if (!make || !model) {
      alert("Por favor, preencha Marca e Modelo para a IA analisar.");
      return;
    }
    setLoadingAI(true);
    const result = await analyzeCarListing(make, model, year, category);
    setPrice(result.suggestedPrice);
    setDescription(result.marketingDescription);
    setFeatures(result.features);
    setLoadingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCar: Omit<Car, 'id'> = {
      ownerId: user.id,
      make,
      model,
      year,
      category,
      pricePerDay: price,
      description,
      imageUrl: `https://picsum.photos/400/300?random=${Math.random()}`,
      features,
      isAvailable: true,
    };
    onAddCar(newCar);
    setIsAdding(false);
    // Reset form
    setMake(''); setModel(''); setDescription(''); setPrice(0);
  };

  if (isAdding) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Cadastrar Novo Veículo</h2>
          <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-700">Cancelar</button>
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
            <p className="text-xs text-indigo-700 mb-4">A IA vai analisar o mercado e sugerir o melhor preço e descrição para seu carro.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço/Dia (R$)</label>
              <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full p-2 border rounded-md font-bold text-lg text-green-700" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Características (separadas por vírgula)</label>
              <input type="text" value={features.join(', ')} onChange={e => setFeatures(e.target.value.split(',').map(s => s.trim()))} className="w-full p-2 border rounded-md" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border rounded-md" required></textarea>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition font-semibold">
            Cadastrar Veículo
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Faturado</p>
              <p className="text-2xl font-bold text-slate-900">R$ 12.450,00</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Meus Carros</p>
              <p className="text-2xl font-bold text-slate-900">{myCars.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full h-full min-h-[50px] flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-5 h-5" />
            Cadastrar Novo Carro
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Desempenho Financeiro</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_EARNINGS_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="earnings" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* My Cars List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Minha Frota</h3>
        {myCars.map(car => (
          <div key={car.id} className="bg-white p-4 rounded-lg border border-slate-200 flex gap-4 items-center">
            <img src={car.imageUrl} alt={car.model} className="w-24 h-24 object-cover rounded-md" />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{car.make} {car.model}</h4>
              <p className="text-sm text-slate-500">{car.year} • {car.category}</p>
              <p className="text-sm text-green-600 font-medium">R$ {car.pricePerDay}/dia</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {car.isAvailable ? 'Disponível' : 'Alugado'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
