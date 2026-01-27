import React, { useState, useEffect, useRef } from 'react';
import { User, Partner, ServiceRequest } from '../types';
import {
    getPartnerByUserId,
    upsertPartnerProfile,
    getPartnerServiceRequests,
    updateServiceRequestStatus
} from '../services/api';
import { supabase } from '../lib/supabase';
import {
    LayoutGrid, FileText, Settings, Loader2, CheckCircle, XCircle, Clock,
    User as UserIcon, Phone, Mail, MapPin, Globe, Wrench, Shield, Star, Upload, Image as ImageIcon
} from 'lucide-react';

interface PartnerDashboardProps {
    user: User;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user, showToast }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'profile'>('overview');
    const [partner, setPartner] = useState<Partner | null>(null);
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Image upload state
    const [imagePreview, setImagePreview] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile form state
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<'mechanic' | 'insurance'>('mechanic');
    const [formDescription, setFormDescription] = useState('');
    const [formContactInfo, setFormContactInfo] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formServiceArea, setFormServiceArea] = useState('');
    const [formWebsite, setFormWebsite] = useState('');
    const [formBenefits, setFormBenefits] = useState<string[]>([]);
    const [formImageUrl, setFormImageUrl] = useState('');

    useEffect(() => {
        loadPartnerData();
    }, [user.id]);

    useEffect(() => {
        if (activeTab === 'requests' && partner) {
            loadRequests();
        }
    }, [activeTab, partner]);

    const loadPartnerData = async () => {
        setLoading(true);
        const data = await getPartnerByUserId(user.id);
        if (data) {
            setPartner(data);
            // Populate form
            setFormName(data.name || '');
            setFormType(data.type || 'mechanic');
            setFormDescription(data.description || '');
            setFormContactInfo(data.contactInfo || '');
            setFormAddress(data.address || '');
            setFormServiceArea(data.serviceArea || '');
            setFormWebsite(data.website || '');
            setFormBenefits(data.benefits || []);
            setFormImageUrl(data.imageUrl || '');
            setImagePreview(data.imageUrl || '');
        }
        setLoading(false);
    };

    const loadRequests = async () => {
        if (!partner) return;
        const data = await getPartnerServiceRequests(partner.id);
        setRequests(data);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione uma imagem válida.', 'error');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showToast('A imagem deve ter no máximo 2MB.', 'error');
            return;
        }

        setUploadingImage(true);

        try {
            // Create a unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `partner_${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `partners/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('partner-images')
                .upload(filePath, file, { upsert: true });

            if (error) {
                // If bucket doesn't exist or upload fails, use local preview URL
                console.error('Upload error:', error);
                // Fallback: create a local preview
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    setImagePreview(base64);
                    setFormImageUrl(base64);
                    showToast('Imagem carregada localmente (preview).', 'info');
                };
                reader.readAsDataURL(file);
            } else {
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('partner-images')
                    .getPublicUrl(filePath);

                const publicUrl = urlData.publicUrl;
                setImagePreview(publicUrl);
                setFormImageUrl(publicUrl);
                showToast('Imagem enviada com sucesso!', 'success');
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            showToast('Erro ao enviar imagem. Tente novamente.', 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const updatedPartner = await upsertPartnerProfile({
            userId: user.id,
            name: formName,
            type: formType,
            description: formDescription,
            contactInfo: formContactInfo,
            address: formAddress,
            serviceArea: formServiceArea,
            website: formWebsite,
            benefits: formBenefits,
            status: 'active',
            imageUrl: formImageUrl
        });

        if (updatedPartner) {
            setPartner(updatedPartner);
            showToast('Perfil atualizado com sucesso!', 'success');
        } else {
            showToast('Erro ao salvar perfil.', 'error');
        }
        setSaving(false);
    };

    const handleRequestAction = async (requestId: string, action: 'accepted' | 'rejected') => {
        const success = await updateServiceRequestStatus(requestId, action);
        if (success) {
            showToast(`Solicitação ${action === 'accepted' ? 'aceita' : 'recusada'}!`, 'success');
            loadRequests();
        } else {
            showToast('Erro ao processar ação.', 'error');
        }
    };

    // Stats
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const acceptedCount = requests.filter(r => r.status === 'accepted' || r.status === 'completed').length;

    const renderTabButton = (id: 'overview' | 'requests' | 'profile', icon: React.ReactNode, label: string) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors duration-200 ${activeTab === id ? 'border-green-600 text-green-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    // Image Upload Component
    const ImageUploadField = () => (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo / Foto da Empresa</label>
            <div className="flex items-start gap-4">
                <div
                    className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 hover:border-green-500 transition cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploadingImage ? (
                        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    ) : imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-2">
                            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                            <span className="text-xs text-slate-500">Clique para enviar</span>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-2 text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? 'Enviando...' : 'Escolher Imagem'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG ou WEBP. Máx. 2MB.</p>
                    {formImageUrl && !formImageUrl.startsWith('data:') && (
                        <p className="text-xs text-green-600 mt-1">✓ Imagem salva</p>
                    )}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
            </div>
        );
    }

    // If no partner profile exists yet, show setup form
    if (!partner) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wrench className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Configure seu Perfil de Parceiro</h2>
                    <p className="text-slate-500 mt-2">Preencha os dados abaixo para começar a receber solicitações de serviço.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Image Upload */}
                    <ImageUploadField />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: AutoMaster Prime" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Serviço</label>
                            <select value={formType} onChange={e => setFormType(e.target.value as 'mechanic' | 'insurance')} className="w-full p-3 border rounded-lg">
                                <option value="mechanic">Mecânica</option>
                                <option value="insurance">Seguradora</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                        <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} className="w-full p-3 border rounded-lg" placeholder="Descreva seus serviços..." required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone/Contato</label>
                            <input type="text" value={formContactInfo} onChange={e => setFormContactInfo(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="(11) 99999-9999" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                            <input type="text" value={formWebsite} onChange={e => setFormWebsite(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="https://..." />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                        <input type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Rua, número, bairro..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Área de Atendimento</label>
                        <input type="text" value={formServiceArea} onChange={e => setFormServiceArea(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Ex: São Paulo - Zona Sul" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Benefícios (separados por vírgula)</label>
                        <input type="text" value={formBenefits.join(', ')} onChange={e => setFormBenefits(e.target.value.split(',').map(s => s.trim()))} className="w-full p-3 border rounded-lg" placeholder="Desconto 20%, Prioridade, ..." />
                    </div>

                    <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Salvar e Ativar Perfil
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                        {partner.imageUrl ? (
                            <img src={partner.imageUrl} alt={partner.name} className="w-full h-full object-cover" />
                        ) : partner.type === 'mechanic' ? (
                            <Wrench className="w-8 h-8" />
                        ) : (
                            <Shield className="w-8 h-8" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{partner.name}</h1>
                        <p className="text-green-100">{partner.type === 'mechanic' ? 'Mecânica' : 'Seguradora'} • {partner.serviceArea || 'Área não definida'}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                        <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                        <span className="font-bold">{partner.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex overflow-x-auto">
                    {renderTabButton('overview', <LayoutGrid className="w-5 h-5" />, 'Visão Geral')}
                    {renderTabButton('requests', <FileText className="w-5 h-5" />, 'Solicitações')}
                    {renderTabButton('profile', <Settings className="w-5 h-5" />, 'Meu Perfil')}
                </div>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Solicitações Pendentes</p>
                                <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full"><Clock className="w-6 h-6 text-orange-600" /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Serviços Realizados</p>
                                <p className="text-3xl font-bold text-green-600">{acceptedCount}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Avaliação Média</p>
                                <p className="text-3xl font-bold text-yellow-600">{partner.rating?.toFixed(1) || '5.0'}</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-full"><Star className="w-6 h-6 text-yellow-600" /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-800">Solicitações de Serviço</h3>
                    {requests.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500">Nenhuma solicitação recebida ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl">
                                            {req.owner?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{req.owner?.name || 'Locador'}</p>
                                            <p className="text-sm text-slate-500">{req.owner?.email}</p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 px-4">
                                        <span className="text-xs font-semibold text-slate-500 uppercase">{req.serviceType}</span>
                                        {req.notes && <p className="text-sm text-slate-600 mt-1">"{req.notes}"</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.status === 'pending' ? (
                                            <>
                                                <button onClick={() => handleRequestAction(req.id, 'accepted')} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4" /> Aceitar
                                                </button>
                                                <button onClick={() => handleRequestAction(req.id, 'rejected')} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                                                    <XCircle className="w-4 h-4" /> Recusar
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                req.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {req.status === 'accepted' ? 'Aceito' : req.status === 'completed' ? 'Concluído' : req.status === 'rejected' ? 'Recusado' : req.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Editar Perfil</h3>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        {/* Image Upload */}
                        <ImageUploadField />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Serviço</label>
                                <select value={formType} onChange={e => setFormType(e.target.value as 'mechanic' | 'insurance')} className="w-full p-3 border rounded-lg">
                                    <option value="mechanic">Mecânica</option>
                                    <option value="insurance">Seguradora</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} className="w-full p-3 border rounded-lg" required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone/Contato</label>
                                <input type="text" value={formContactInfo} onChange={e => setFormContactInfo(e.target.value)} className="w-full p-3 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                                <input type="text" value={formWebsite} onChange={e => setFormWebsite(e.target.value)} className="w-full p-3 border rounded-lg" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                            <input type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full p-3 border rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Área de Atendimento</label>
                            <input type="text" value={formServiceArea} onChange={e => setFormServiceArea(e.target.value)} className="w-full p-3 border rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Benefícios (separados por vírgula)</label>
                            <input type="text" value={formBenefits.join(', ')} onChange={e => setFormBenefits(e.target.value.split(',').map(s => s.trim()))} className="w-full p-3 border rounded-lg" />
                        </div>

                        <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Salvar Alterações
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
