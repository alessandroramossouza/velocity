
import React, { useState } from 'react';
import { Car, User } from '../types';
import { analyzeCarListing } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sparkles, Plus, Car as CarIcon, DollarSign, Loader2, Upload, Pencil } from 'lucide-react'; // Import Pencil
import { supabase } from '../lib/supabase';

interface OwnerDashboardProps {
  user: User;
  myCars: Car[];
  onAddCar: (car: Omit<Car, 'id'>) => void;
  onUpdateCar: (car: Car) => void; // Nova prop
}

const MOCK_EARNINGS_DATA = [
  { name: 'Jan', earnings: 1200 },
  { name: 'Fev', earnings: 1900 },
  { name: 'Mar', earnings: 1500 },
  { name: 'Abr', earnings: 2200 },
  { name: 'Mai', earnings: 2800 },
  { name: 'Jun', earnings: 2400 },
];

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, myCars, onAddCar, onUpdateCar }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null); // State para edição
  const [loadingAI, setLoadingAI] = useState(false);

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

  // Preencher formulário ao clicar em Editar
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
    setImageFile(null); // Reset file input
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se estiver editando, usa a imagem antiga como fallback
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
          console.error("Upload error details:", uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('cars')
          .getPublicUrl(filePath);

        finalImageUrl = data.publicUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Erro no Upload. Usando imagem anterior/padrão.');
      } finally {
        setUploading(false);
      }
    }

    if (editingCar) {
      // Atualizar
      const updatedCar: Car = {
        ...editingCar,
        make, model, year, category, pricePerDay: price, description, imageUrl: finalImageUrl, features,
      };
      onUpdateCar(updatedCar);
    } else {
      // Criar
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
    }

    handleCancel();
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
            <p className="text-xs text-indigo-700 mb-4">A IA vai analisar o mercado e sugerir o melhor preço e descrição para seu carro.</p>
          </div>

          {/* Image Upload Input */}
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Foto do Veículo {editingCar && '(Deixe vazio para manter a atual)'}
            </label>
            {editingCar && <div className="mb-2 text-xs text-slate-500">Imagem atual: {editingCar.imageUrl}</div>}
            <input
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-700 cursor-pointer"
            />
            {imageFile && <p className="text-xs text-green-600 mt-2 font-medium">Imagem selecionada: {imageFile.name}</p>}
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

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition font-semibold disabled:opacity-50 flex justify-center"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {editingCar ? 'Salvando Alterações...' : 'Cadastrar Veículo'}
              </>
            ) : (editingCar ? 'Salvar Edição' : 'Cadastrar Veículo')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats and Add Button */}
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
            onClick={() => { setEditingCar(null); resetForm(); setIsAdding(true); }}
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
          <div key={car.id} className="bg-white p-4 rounded-lg border border-slate-200 flex gap-4 items-center group relative hover:border-indigo-300 transition-colors">
            <img src={car.imageUrl} alt={car.model} className="w-24 h-24 object-cover rounded-md" />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900">{car.make} {car.model}</h4>
              <p className="text-sm text-slate-500">{car.year} • {car.category}</p>
              <p className="text-sm text-green-600 font-medium">R$ {car.pricePerDay}/dia</p>
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${car.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {car.isAvailable ? 'Disponível' : 'Alugado'}
              </span>

              {/* Edit Button */}
              <button
                onClick={() => startEditing(car)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md"
              >
                <Pencil className="w-3 h-3" />
                Editar
              </button>
            </div>
          </div>
        ))}
        {myCars.length === 0 && (
          <p className="text-slate-500 text-center py-8">Você ainda não tem carros cadastrados.</p>
        )}
      </div>
    </div>
  );
};
