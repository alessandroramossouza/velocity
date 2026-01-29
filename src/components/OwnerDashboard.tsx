import React, { useState, useEffect } from 'react';
import { Car, User, Rental, Partner, ServiceRequest } from '../types';
import { analyzeCarListing } from '../services/geminiService';
import { getActiveRentals, completeRental, getOwnerRentalHistory, getPartners, createServiceRequest, getOwnerServiceRequests } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Sparkles, Plus, Car as CarIcon, DollarSign, Loader2, Upload, Pencil, RotateCcw,
  Calendar, AlertCircle, LayoutGrid, History, ChevronRight, User as UserIcon, CheckCircle, XCircle, Wrench, Shield, CreditCard, FileText, Eye
} from 'lucide-react';
import { uploadContractTemplate } from '../services/contractService';
import { supabase } from '../lib/supabase';
import { PaymentModal } from './PaymentModal';
import { Payment } from '../services/payments';

const RenterDetailsModal = ({ renter, onClose }: { renter: User, onClose: () => void }) => {
  if (!renter) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-xl font-bold border-2 border-white/20">
              {renter.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{renter.name}</h2>
              <div className="flex items-center gap-2 text-indigo-200 text-sm">
                <span className="bg-indigo-500/30 px-2 py-0.5 rounded text-xs">{renter.email}</span>
                {renter.isVerified && <span className="flex items-center gap-1 text-green-400 font-medium"><CheckCircle className="w-3 h-3" /> Verificado</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition bg-white/10 p-2 rounded-full hover:bg-white/20">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-8">
          {/* Section 1: Personal Data */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><p className="text-xs text-slate-500 mb-1">CPF</p><p className="font-medium text-slate-900 text-lg">{renter.cpf || 'Não informado'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">RG</p><p className="font-medium text-slate-900 text-lg">{renter.rg || 'Não informado'}</p></div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Endereço Completo</h3>
            {renter.address ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2"><p className="text-xs text-slate-500 mb-1">Logradouro</p><p className="font-medium text-slate-900">{renter.address}, {renter.number}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Bairro</p><p className="font-medium text-slate-900">{renter.neighborhood}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Complemento</p><p className="font-medium text-slate-900">{renter.complement || '-'}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Cidade/UF</p><p className="font-medium text-slate-900">{renter.city} / {renter.state}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">CEP</p><p className="font-medium text-slate-900">{renter.cep}</p></div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Endereço não cadastrado.</p>
            )}
          </div>

          {/* Section 3: Documents */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Documentação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentCard title="Documento (CPF/CNH)" url={renter.cpfUrl} icon={<FileText className="w-5 h-5" />} />
              <DocumentCard title="Comprovante de Residência" url={renter.proofResidenceUrl} icon={<AlertCircle className="w-5 h-5" />} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentCard = ({ title, url, icon }: { title: string, url?: string, icon: any }) => (
  <div className={`p-4 rounded-xl border-l-4 transition hover:shadow-md ${url ? 'bg-indigo-50 border-indigo-500 cursor-pointer group' : 'bg-slate-50 border-slate-300 opacity-60'}`}
    onClick={() => url && window.open(url, '_blank')}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${url ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>{icon}</div>
      <div>
        <p className="font-bold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 group-hover:text-indigo-600 transition">
          {url ? 'Clique para visualizar' : 'Pendente de envio'}
        </p>
      </div>
      {url && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 group-hover:translate-x-1 transition" />}
    </div>
  </div>
);

interface OwnerDashboardProps {
  user: User;
  myCars: Car[];
  onAddCar: (car: Omit<Car, 'id'>) => void;
  onUpdateCar: (car: Car) => void;
  onCarReturned: (carId: string | number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user, myCars, onAddCar, onUpdateCar, onCarReturned, showToast }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cars' | 'history' | 'partners'>('overview');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [rentalHistory, setRentalHistory] = useState<Rental[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [myServiceRequests, setMyServiceRequests] = useState<ServiceRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState<Partner | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{ serviceRequest: ServiceRequest, partner: Partner } | null>(null);
  const [viewingRenter, setViewingRenter] = useState<User | null>(null);

  // Date Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState<Car['category']>('Sedan');
  const [price, setPrice] = useState(0);
  const [priceWeek, setPriceWeek] = useState<number | undefined>();
  const [priceMonth, setPriceMonth] = useState<number | undefined>();
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Contract PDF Upload State
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [existingContractUrl, setExistingContractUrl] = useState<string | null>(null);

  useEffect(() => {
    loadActiveRentals();

    // Realtime Subscription
    const channel = supabase
      .channel('owner-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rentals' },
        (payload) => {
          console.log('Change received!', payload);
          loadActiveRentals();
          if (activeTab === 'history') loadHistory(); // Reload history if active
          if (payload.eventType === 'INSERT') {
            showToast('Novo aluguel recebido!', 'success');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
    if (activeTab === 'partners') {
      loadPartners();
    }
  }, [activeTab]);

  const loadActiveRentals = async () => {
    const rentals = await getActiveRentals(user.id);
    setActiveRentals(rentals);
  };


  const loadHistory = async () => {
    setLoadingHistory(true);
    const history = await getOwnerRentalHistory(user.id);
    setRentalHistory(history);
    setLoadingHistory(false);
  };

  const loadPartners = async () => {
    setLoadingPartners(true);
    const data = await getPartners();
    if (data.length === 0) {
      // Fallback mock data if DB is empty/connection fails for immediate demo
      setPartners([
        {
          id: '1', name: 'AutoMaster Prime', type: 'mechanic',
          description: 'Especializada em carros de luxo e esportivos.',
          contactInfo: '(11) 99999-1001', rating: 4.9,
          imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
          benefits: ['Desconto de 20%', 'Prioridade na fila']
        },
        {
          id: '2', name: 'SafeDrive Seguros', type: 'insurance',
          description: 'Seguro completo para frotas de aluguel.',
          contactInfo: 'contato@safedrive.com', rating: 4.8,
          imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=80',
          benefits: ['Cobertura total', 'Carro reserva']
        }
      ]);
    } else {
      setPartners(data);
    }
    // Also load owner's service requests
    const requests = await getOwnerServiceRequests(user.id);
    setMyServiceRequests(requests);
    setLoadingPartners(false);
  };

  const handleRequestService = async (partner: Partner, serviceType: ServiceRequest['serviceType']) => {
    setSendingRequest(true);
    const result = await createServiceRequest(user.id, partner.id, serviceType, requestNotes);
    if (result) {
      showToast(`Solicitação enviada para ${partner.name}!`, 'success');
      setShowRequestModal(null);
      setRequestNotes('');
      // Reload requests
      const requests = await getOwnerServiceRequests(user.id);
      setMyServiceRequests(requests);
    } else {
      showToast('Erro ao enviar solicitação.', 'error');
    }
    setSendingRequest(false);
  };

  const startEditing = (car: Car) => {
    setEditingCar(car);
    setMake(car.make);
    setModel(car.model);
    setYear(car.year);
    setCategory(car.category);
    setPrice(car.pricePerDay);
    setPriceWeek(car.pricePerWeek);
    setPriceMonth(car.pricePerMonth);
    setDescription(car.description);
    setFeatures(car.features);
    setIsAdding(true);
    setImageFile(null);
    setContractFile(null);
    setExistingContractUrl(car.contractPdfUrl || null);
    setActiveTab('cars'); // Switch to cars tab to show form
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingCar(null);
    resetForm();
  };

  const resetForm = () => {
    setMake(''); setModel(''); setDescription(''); setPrice(0); setImageFile(null); setFeatures([]);
    setContractFile(null); setExistingContractUrl(null);
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
    let finalContractUrl = editingCar?.contractPdfUrl || undefined;

    setUploading(true);

    // Upload da imagem
    if (imageFile) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cars')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('cars')
          .getPublicUrl(filePath);

        finalImageUrl = data.publicUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Falha no upload da imagem. Usando padrão.', 'error');
      }
    }

    // Upload do contrato PDF
    if (contractFile) {
      try {
        const fileExt = contractFile.name.split('.').pop();
        // Simplificado: Sem pasta templates para evitar erro de permissão em pasta
        const fileName = `contract_${Date.now()}.${fileExt}`;

        console.log('Iniciando upload do contrato para bucket contracts:', fileName);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('contracts')
          .upload(fileName, contractFile, {
            cacheControl: '3600',
            upsert: false // Mudado para false para teste
          });

        if (uploadError) {
          console.error('Detalhes do erro de upload:', uploadError);
          throw uploadError;
        }

        console.log('Upload sucesso:', uploadData);

        const { data } = supabase.storage
          .from('contracts')
          .getPublicUrl(fileName);

        finalContractUrl = data.publicUrl;
        showToast('Contrato PDF enviado com sucesso!', 'success');
      } catch (error: any) {
        console.error('Error uploading contract COMPLETELY:', error);
        showToast(`Falha no upload: ${error.message || 'Erro desconhecido'}`, 'error');
      }
    }

    setUploading(false);

    const commonData = {
      make, model, year, category,
      pricePerDay: price,
      pricePerWeek: priceWeek,
      pricePerMonth: priceMonth,
      description, imageUrl: finalImageUrl, features,
      contractPdfUrl: finalContractUrl,
    };

    if (editingCar) {
      onUpdateCar({ ...editingCar, ...commonData });
      showToast("Veículo atualizado!", 'success');
    } else {
      onAddCar({ ownerId: user.id, isAvailable: true, ...commonData });
      showToast("Veículo cadastrado!", 'success');
    }

    handleCancel();
  };

  const handleReturnCar = async (rental: Rental) => {
    if (!confirm(`Confirmar devolução do veículo?`)) return;

    try {
      await completeRental(rental.id, String(rental.carId));
      setActiveRentals(activeRentals.filter(r => r.id !== rental.id));
      onCarReturned(rental.carId);
      loadHistory(); // Refresh history
      showToast("Veículo devolvido e disponível novamente!", 'success');
    } catch (e) {
      showToast("Erro ao processar devolução.", 'error');
    }
  };

  const getCarForRental = (rental: Rental) => {
    // Try to get from rental object first (if populated by history fetch), fallback to myCars find
    return (rental as any).car || myCars.find(c => String(c.id) === String(rental.carId));
  };

  // Stats
  const rentedCarsCount = myCars.filter(c => !c.isAvailable).length;
  const totalEarnings = activeRentals.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const chartData = [
    { name: 'Faturado', value: totalEarnings },
    { name: 'Potencial', value: myCars.reduce((acc, c) => acc + c.pricePerDay * 30, 0) }
  ];

  if (isAdding) {
    // Form Layout (Keep existing form layout logic, just wrapped properly)
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingCar ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
          </h2>
          <button onClick={handleCancel} className="text-slate-500 hover:text-slate-700">Cancelar</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields same as before... re-implementing to ensure it works */}
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
              <button type="button" onClick={handleAIAnalysis} disabled={loadingAI} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-700 transition flex items-center gap-2">
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
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="hidden" id="car-upload" />
            <label htmlFor="car-upload" className="w-full text-sm text-slate-500 flex items-center gap-2 cursor-pointer">
              <span className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-semibold">Escolher Arquivo</span>
              {imageFile ? <span className="text-green-600 font-medium">{imageFile.name}</span> : <span className="text-slate-400">Nenhum arquivo selecionado</span>}
            </label>
          </div>

          {/* Contract PDF Upload */}
          <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 hover:bg-purple-100 transition">
            <label className="block text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contrato PDF (Opcional)
            </label>
            <p className="text-xs text-purple-600 mb-3">
              Faça upload de um contrato personalizado. Use placeholders como: {'{{NOME_LOCATARIO}}'}, {'{{CPF_LOCATARIO}}'}, {'{{VEICULO}}'}, {'{{DATA_INICIO}}'}, {'{{DATA_FIM}}'}, {'{{VALOR_TOTAL}}'}.
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setContractFile(e.target.files ? e.target.files[0] : null)}
              className="hidden"
              id="contract-upload"
            />
            <label htmlFor="contract-upload" className="w-full text-sm text-purple-700 flex items-center gap-2 cursor-pointer">
              <span className="bg-purple-600 text-white px-4 py-2 rounded-full text-xs font-semibold">Escolher PDF</span>
              {contractFile ? (
                <span className="text-green-600 font-medium">{contractFile.name}</span>
              ) : existingContractUrl ? (
                <span className="text-purple-500">Contrato já cadastrado ✓</span>
              ) : (
                <span className="text-purple-400">Nenhum contrato (será gerado automaticamente)</span>
              )}
            </label>
            {existingContractUrl && !contractFile && (
              <a
                href={existingContractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 underline mt-2 inline-block"
              >
                Ver contrato atual
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Características (vírgula)</label>
              <input type="text" value={features.join(', ')} onChange={e => setFeatures(e.target.value.split(',').map(s => s.trim()))} className="w-full p-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Dia (R$)</label>
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full p-2 border rounded-md font-bold text-green-700" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Semana (R$)</label>
                <input type="number" value={priceWeek || ''} onChange={e => setPriceWeek(Number(e.target.value))} className="w-full p-2 border rounded-md text-sm" placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mês (R$)</label>
                <input type="number" value={priceMonth || ''} onChange={e => setPriceMonth(Number(e.target.value))} className="w-full p-2 border rounded-md text-sm" placeholder="Opcional" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border rounded-md" required></textarea>
          </div>

          <button type="submit" disabled={uploading} className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition font-semibold disabled:opacity-50 flex justify-center">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingCar ? 'Salvar Alterações' : 'Cadastrar Veículo')}
          </button>
        </form>
      </div>
    );
  }

  // Render Tabs
  const renderTabButton = (id: 'overview' | 'cars' | 'history' | 'partners', icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors duration-200 ${activeTab === id ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {viewingRenter && <RenterDetailsModal renter={viewingRenter} onClose={() => setViewingRenter(null)} />}
      {/* Dashboard Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex overflow-x-auto">
          {renderTabButton('overview', <LayoutGrid className="w-5 h-5" />, 'Visão Geral')}
          {renderTabButton('cars', <CarIcon className="w-5 h-5" />, 'Minha Frota')}
          {renderTabButton('history', <History className="w-5 h-5" />, 'Histórico de Locações')}
          {renderTabButton('partners', <Wrench className="w-5 h-5" />, 'Parceiros & Serviços')}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Faturado</p>
                  <p className="text-2xl font-bold text-slate-900">R$ {totalEarnings.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full"><DollarSign className="w-5 h-5 text-green-600" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Meus Carros</p>
                  <p className="text-2xl font-bold text-slate-900">{myCars.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full"><CarIcon className="w-5 h-5 text-blue-600" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Alugados Agora</p>
                  <p className="text-2xl font-bold text-orange-600">{rentedCarsCount}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full"><Calendar className="w-5 h-5 text-orange-600" /></div>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border flex items-center justify-center border-slate-200 cursor-pointer hover:bg-slate-50 transition" onClick={() => { setEditingCar(null); resetForm(); setIsAdding(true); }}>
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <Plus className="w-5 h-5" />
                <span>Novo Veículo</span>
              </div>
            </div>
          </div>

          {/* Active Rentals (Important Alert) */}
          {activeRentals.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-bold text-orange-900">Aluguéis em Andamento ({activeRentals.length})</h3>
              </div>
              <div className="space-y-3">
                {activeRentals.map(rental => {
                  const car = getCarForRental(rental);
                  return (
                    <div key={rental.id} className="bg-white p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm border border-slate-100">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
                          {rental.renter?.name.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{rental.renter?.name || 'Locatário Desconhecido'}</p>
                          <p className="text-sm text-slate-500">{car ? `${car.make} ${car.model}` : 'Carro não encontrado'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase font-semibold">Devolução</p>
                          <p className="font-bold text-slate-800">{new Date(rental.endDate).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => rental.renter && setViewingRenter(rental.renter)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Ver Ficha
                        </button>
                        <button onClick={() => handleReturnCar(rental)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" /> Receber
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Projeção Financeira</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* CARS TAB */}
      {activeTab === 'cars' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800">Minha Frota ({myCars.length})</h3>
            <button onClick={() => { setEditingCar(null); resetForm(); setIsAdding(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Carro
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCars.map(car => (
              <div key={car.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition">
                <div className="relative h-48">
                  <img src={car.imageUrl} alt={car.model} className="w-full h-full object-cover" />
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${car.isAvailable ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {car.isAvailable ? 'Disponível' : 'Alugado'}
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-lg text-slate-900">{car.make} {car.model}</h4>
                  <p className="text-slate-500 text-sm mb-4">{car.year} • {car.category}</p>

                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-green-700 font-bold text-lg">R$ {car.pricePerDay}<span className="text-sm font-normal text-slate-500">/dia</span></span>
                    <button onClick={() => startEditing(car)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1">
                      Editar <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <h3 className="text-xl font-bold text-slate-800">Histórico de Locações</h3>

            {/* Date Filters */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase px-1">De</span>
                <input
                  type="date"
                  className="text-sm bg-transparent border-none focus:ring-0 p-1 text-slate-700"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>
              <div className="h-8 w-px bg-slate-200 mx-1"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase px-1">Até</span>
                <input
                  type="date"
                  className="text-sm bg-transparent border-none focus:ring-0 p-1 text-slate-700"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="ml-2 text-xs text-slate-400 hover:text-slate-600 underline"
                title="Limpar filtros"
              >
                Limpar
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : rentalHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
              <UserIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Nenhum histórico de locação encontrado.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Status</th>
                      <th className="p-4">Veículo</th>
                      <th className="p-4">Locatário</th>
                      <th className="p-4">Período</th>
                      <th className="p-4 text-right">Valor Total</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rentalHistory
                      .filter(rental => {
                        if (!filterStartDate && !filterEndDate) return true;
                        const rentalStart = new Date(rental.startDate);
                        const startFilter = filterStartDate ? new Date(filterStartDate) : null;
                        const endFilter = filterEndDate ? new Date(filterEndDate) : null;

                        if (startFilter && rentalStart < startFilter) return false;
                        if (endFilter && rentalStart > endFilter) return false;
                        return true;
                      })
                      .map(rental => {
                        const car = getCarForRental(rental);
                        // Use a simpler find if car is partially populated
                        const carDisplay = (rental as any).car || car;

                        const isCompleted = rental.status === 'completed';
                        const isActive = rental.status === 'active';

                        return (
                          <tr key={rental.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                isCompleted ? 'bg-green-100 text-green-700 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                {isActive ? 'Em Andamento' : isCompleted ? 'Concluído' : rental.status}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-slate-900">
                              {carDisplay ? `${carDisplay.make} ${carDisplay.model}` : 'Veículo Removido'}
                            </td>
                            <td className="p-4">
                              {rental.renter ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {rental.renter.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-900">{rental.renter.name}</span>
                                    <span className="text-xs text-slate-400">{rental.renter.email}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Usuário não encontrado</span>
                              )}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span>{new Date(rental.startDate).toLocaleDateString()}</span>
                                <span className="text-slate-400 text-xs">até {new Date(rental.endDate).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-900">
                              R$ {rental.totalPrice?.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => rental.renter && setViewingRenter(rental.renter)}
                                title="Ver Ficha do Locatário"
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition mr-2"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              {isActive && (
                                <button
                                  onClick={() => handleReturnCar(rental)}
                                  title="Receber Devolução"
                                  className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              {isCompleted && (
                                <span className="text-slate-400 text-xs">Finalizado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      {/* PARTNERS TAB */}
      {activeTab === 'partners' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Parceiros & Serviços</h3>
            <p className="text-slate-500">Mecânicas e Seguros recomendados para manter sua frota em dia.</p>
          </div>

          {/* Service Request Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Solicitar Serviço de {showRequestModal.name}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Serviço</label>
                    <select id="serviceType" className="w-full p-3 border rounded-lg" defaultValue={showRequestModal.type === 'mechanic' ? 'maintenance' : 'insurance_quote'}>
                      <option value="maintenance">Manutenção</option>
                      <option value="insurance_quote">Cotação de Seguro</option>
                      <option value="emergency">Emergência</option>
                      <option value="general">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações (opcional)</label>
                    <textarea
                      value={requestNotes}
                      onChange={e => setRequestNotes(e.target.value)}
                      rows={3}
                      className="w-full p-3 border rounded-lg"
                      placeholder="Descreva o que você precisa..."
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowRequestModal(null)}
                      className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const select = document.getElementById('serviceType') as HTMLSelectElement;
                        handleRequestService(showRequestModal, select.value as ServiceRequest['serviceType']);
                      }}
                      disabled={sendingRequest}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                      {sendingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      Enviar Solicitação
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Service Requests */}
          {myServiceRequests.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Minhas Solicitações ({myServiceRequests.length})
              </h4>
              <div className="space-y-3">
                {myServiceRequests.slice(0, 5).map(req => {
                  const partner = partners.find(p => p.id === req.partnerId);
                  const estimatedPrice = req.serviceType === 'maintenance' ? 350 :
                    req.serviceType === 'insurance_quote' ? 250 :
                      req.serviceType === 'emergency' ? 500 : 200;
                  return (
                    <div key={req.id} className="bg-white p-4 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800">{partner?.name || 'Parceiro'}</p>
                          <p className="text-xs text-slate-500">{req.serviceType} • {new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === 'accepted' && (
                            <button
                              onClick={() => partner && setShowPaymentModal({ serviceRequest: req, partner })}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1.5"
                            >
                              <CreditCard className="w-4 h-4" />
                              Pagar R$ {estimatedPrice.toFixed(2)}
                            </button>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                              req.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {req.status === 'pending' ? 'Pendente' : req.status === 'accepted' ? 'Aceito' : req.status === 'completed' ? 'Concluído' : 'Recusado'}
                          </span>
                        </div>
                      </div>
                      {req.notes && (
                        <p className="text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded">{req.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Modal for Services */}
          {showPaymentModal && (
            <PaymentModal
              isOpen={!!showPaymentModal}
              onClose={() => setShowPaymentModal(null)}
              onSuccess={(payment: Payment) => {
                showToast(`Pagamento realizado com sucesso para ${showPaymentModal.partner.name}!`, 'success');
                setShowPaymentModal(null);
                loadPartners(); // Reload to update status
              }}
              userId={user.id}
              amount={showPaymentModal.serviceRequest.serviceType === 'maintenance' ? 350 :
                showPaymentModal.serviceRequest.serviceType === 'insurance_quote' ? 250 :
                  showPaymentModal.serviceRequest.serviceType === 'emergency' ? 500 : 200}
              description={`Serviço: ${showPaymentModal.serviceRequest.serviceType} - ${showPaymentModal.partner.name}`}
              receiverId={showPaymentModal.partner.userId}
              serviceRequestId={showPaymentModal.serviceRequest.id}
            />
          )}

          {loadingPartners ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mechanics Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-slate-700 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-indigo-600" />
                  Mecânicas Especializadas
                </h4>
                {partners.filter(p => p.type === 'mechanic').map(partner => (
                  <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                    <div className="flex">
                      <div className="w-1/3 relative">
                        <img src={partner.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt={partner.name} />
                      </div>
                      <div className="w-2/3 p-4">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-slate-900">{partner.name}</h5>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                            ★ {partner.rating}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{partner.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {partner.benefits.slice(0, 2).map((b, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b}</span>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400">{partner.contactInfo}</span>
                          <button onClick={() => setShowRequestModal(partner)} className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-indigo-700 transition">
                            Solicitar Serviço
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Insurance Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-slate-700 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Seguros e Proteção
                </h4>
                {partners.filter(p => p.type === 'insurance').map(partner => (
                  <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                    <div className="flex">
                      <div className="w-1/3 relative">
                        <img src={partner.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt={partner.name} />
                      </div>
                      <div className="w-2/3 p-4">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-slate-900">{partner.name}</h5>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                            ★ {partner.rating}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{partner.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {partner.benefits.slice(0, 2).map((b, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b}</span>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-400">{partner.contactInfo}</span>
                          <button onClick={() => setShowRequestModal(partner)} className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-green-700 transition">
                            Solicitar Cotação
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
