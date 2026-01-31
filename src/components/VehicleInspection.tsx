// ============================================================
// VELOCITY - FASE 1: Vistoria de Veículos
// ============================================================
// Check-in/Check-out com fotos para evitar disputas
// ============================================================

import React, { useState } from 'react';
import {
  Camera, Upload, CheckCircle, AlertTriangle, X, Fuel, Gauge,
  MapPin, Cloud, FileText, Image as ImageIcon, Plus, Trash2,
  Save, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  VehicleInspection,
  InspectionPhoto,
  VehicleDamage,
  InspectionFormData
} from '../types-fase1';
import {
  createInspection,
  uploadInspectionPhoto,
  addPhotosToInspection,
  generateDamageId,
  generatePhotoId,
  estimateDamageCost,
  formatOdometer,
  formatFuelLevel
} from '../services/inspectionService';
import { User, Rental, Car } from '../types';

interface VehicleInspectionProps {
  rental: Rental;
  car: Car;
  currentUser: User;
  inspectionType: 'check_in' | 'check_out';
  onComplete: (inspection: VehicleInspection) => void;
  onClose: () => void;
}

export const VehicleInspectionModal: React.FC<VehicleInspectionProps> = ({
  rental,
  car,
  currentUser,
  inspectionType,
  onComplete,
  onClose
}) => {
  const [step, setStep] = useState<'intro' | 'photos' | 'odometer' | 'fuel' | 'damages' | 'review'>('intro');
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [odometerReading, setOdometerReading] = useState<number>();
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [damages, setDamages] = useState<Omit<VehicleDamage, 'id'>[]>([]);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Current damage being added
  const [newDamage, setNewDamage] = useState<Partial<VehicleDamage>>({
    severity: 'minor',
    type: 'scratch'
  });

  const isCheckIn = inspectionType === 'check_in';

  // ============================================================
  // HANDLERS
  // ============================================================

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await uploadInspectionPhoto(file, rental.id, inspectionType, 'other');

      if (url) {
        const photo: InspectionPhoto = {
          id: generatePhotoId(),
          url,
          type: 'other',
          description: '',
          timestamp: new Date().toISOString()
        };
        setPhotos(prev => [...prev, photo]);
      }
    }

    setUploading(false);
  };

  const handleAddDamage = () => {
    if (!newDamage.location || !newDamage.description) {
      alert('Preencha localização e descrição do dano.');
      return;
    }

    const damage: Omit<VehicleDamage, 'id'> = {
      location: newDamage.location!,
      type: newDamage.type!,
      severity: newDamage.severity!,
      description: newDamage.description!,
      photoUrl: newDamage.photoUrl,
      estimatedCost: estimateDamageCost(newDamage.type!, newDamage.severity!)
    };

    setDamages(prev => [...prev, damage]);
    setNewDamage({ severity: 'minor', type: 'scratch' });
  };

  const handleRemoveDamage = (index: number) => {
    setDamages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validações
    if (photos.length < 5) {
      alert('Envie ao menos 5 fotos (frente, traseira, laterais, interior, painel).');
      return;
    }

    if (!odometerReading) {
      alert('Informe a leitura do hodômetro.');
      return;
    }

    setSaving(true);

    try {
      const formData: InspectionFormData = {
        rentalId: rental.id,
        inspectionType,
        odometerReading,
        fuelLevel,
        damages,
        notes,
        location,
        weatherConditions: weather
      };

      const inspection = await createInspection(formData, currentUser.id, currentUser.name);

      if (inspection) {
        // Adicionar fotos
        await addPhotosToInspection(inspection.id, photos);

        // Notificar sucesso
        onComplete(inspection);
      } else {
        alert('Erro ao criar vistoria. Tente novamente.');
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      alert('Erro ao salvar vistoria.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RENDER STEPS
  // ============================================================

  const renderIntro = () => (
    <div className="p-8 space-y-6 text-center">
      <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
        <Camera className="w-10 h-10 text-indigo-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {isCheckIn ? 'Check-in do Veículo' : 'Check-out do Veículo'}
        </h2>
        <p className="text-slate-600">
          {isCheckIn
            ? 'Vamos registrar o estado atual do veículo antes da entrega ao locatário.'
            : 'Vamos registrar o estado do veículo na devolução para identificar possíveis danos.'}
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          O que você vai precisar:
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Mínimo <strong>5 fotos</strong> (frente, traseira, laterais, interior, painel)</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Leitura do <strong>hodômetro</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Nível de <strong>combustível</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>Registro de <strong>danos</strong> (se houver)</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Importante:
        </p>
        <p className="text-xs">
          Esta vistoria é essencial para proteger locador e locatário. Registre TODOS os danos visíveis
          e tire fotos claras de todos os ângulos.
        </p>
      </div>

      <button
        onClick={() => setStep('photos')}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
      >
        Iniciar Vistoria <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderPhotos = () => (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Camera className="w-6 h-6 text-indigo-600" />
          Fotos do Veículo
        </h3>
        <p className="text-sm text-slate-600">
          Tire fotos de todos os ângulos. Mínimo: 5 fotos.
        </p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition cursor-pointer bg-slate-50">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          className="hidden"
          id="photo-upload"
          disabled={uploading}
        />
        <label htmlFor="photo-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 font-medium mb-1">
            {uploading ? 'Enviando fotos...' : 'Clique para adicionar fotos'}
          </p>
          <p className="text-xs text-slate-500">
            JPEG, PNG (máx. 5MB por foto)
          </p>
        </label>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
              />
              <button
                onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">
          Fotos enviadas: <strong className={photos.length >= 5 ? 'text-green-600' : 'text-red-600'}>
            {photos.length}/5 mínimo
          </strong>
        </span>
        {photos.length >= 5 && (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('intro')}
          className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-5 h-5 inline mr-1" />
          Voltar
        </button>
        <button
          onClick={() => setStep('odometer')}
          disabled={photos.length < 5}
          className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
          <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );

  const renderOdometer = () => (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Gauge className="w-6 h-6 text-indigo-600" />
          Hodômetro
        </h3>
        <p className="text-sm text-slate-600">
          Informe a quilometragem atual do veículo.
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Leitura do Hodômetro (km)
        </label>
        <input
          type="number"
          value={odometerReading || ''}
          onChange={e => setOdometerReading(Number(e.target.value))}
          placeholder="Ex: 45230"
          className="w-full p-4 border-2 border-slate-300 rounded-lg text-2xl font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        {odometerReading && (
          <p className="text-center text-sm text-green-600 font-medium mt-2">
            {formatOdometer(odometerReading)}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('photos')}
          className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-5 h-5 inline mr-1" />
          Voltar
        </button>
        <button
          onClick={() => setStep('fuel')}
          disabled={!odometerReading}
          className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
        >
          Continuar
          <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );

  const renderFuel = () => (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Fuel className="w-6 h-6 text-indigo-600" />
          Nível de Combustível
        </h3>
        <p className="text-sm text-slate-600">
          Indique o nível atual de combustível no tanque.
        </p>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          {formatFuelLevel(fuelLevel)} ({fuelLevel}%)
        </label>

        <input
          type="range"
          min="0"
          max="100"
          step="25"
          value={fuelLevel}
          onChange={e => setFuelLevel(Number(e.target.value))}
          className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />

        <div className="flex justify-between text-xs text-slate-500">
          <span>Vazio</span>
          <span>1/4</span>
          <span>1/2</span>
          <span>3/4</span>
          <span>Cheio</span>
        </div>

        {/* Visual Fuel Gauge */}
        <div className="relative h-32 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300">
          <div
            className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-green-400 transition-all duration-300"
            style={{ height: `${fuelLevel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-black text-white drop-shadow-lg">{fuelLevel}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep('odometer')}
          className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-5 h-5 inline mr-1" />
          Voltar
        </button>
        <button
          onClick={() => setStep('damages')}
          className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Continuar
          <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );

  const renderDamages = () => (
    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          Registro de Danos
        </h3>
        <p className="text-sm text-slate-600">
          Registre qualquer arranhão, amassado ou dano visível.
        </p>
      </div>

      {/* Existing Damages List */}
      {damages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-700 text-sm">Danos Registrados ({damages.length})</h4>
          {damages.map((damage, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-slate-900">{damage.location}</p>
                <p className="text-sm text-slate-600">{damage.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{damage.type}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    damage.severity === 'severe' ? 'bg-red-100 text-red-700' :
                    damage.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {damage.severity}
                  </span>
                  {damage.estimatedCost && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                      ~R$ {damage.estimatedCost}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveDamage(index)}
                className="text-red-600 hover:text-red-800 ml-4"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Damage Form */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border-2 border-dashed border-slate-300">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Novo Dano
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
            <select
              value={newDamage.type}
              onChange={e => setNewDamage({ ...newDamage, type: e.target.value as any })}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="scratch">Arranhão</option>
              <option value="dent">Amassado</option>
              <option value="crack">Rachadura</option>
              <option value="missing_part">Peça Faltando</option>
              <option value="stain">Mancha</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Gravidade</label>
            <select
              value={newDamage.severity}
              onChange={e => setNewDamage({ ...newDamage, severity: e.target.value as any })}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="minor">Leve</option>
              <option value="moderate">Moderado</option>
              <option value="severe">Grave</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Localização</label>
          <input
            type="text"
            value={newDamage.location || ''}
            onChange={e => setNewDamage({ ...newDamage, location: e.target.value })}
            placeholder="Ex: Para-choque dianteiro esquerdo"
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
          <textarea
            value={newDamage.description || ''}
            onChange={e => setNewDamage({ ...newDamage, description: e.target.value })}
            placeholder="Descreva o dano com detalhes..."
            rows={2}
            className="w-full p-2 border rounded-lg text-sm"
          />
        </div>

        <button
          onClick={handleAddDamage}
          className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar Dano
        </button>
      </div>

      {damages.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-700">
            Nenhum dano registrado. Veículo em perfeito estado!
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={() => setStep('fuel')}
          className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
        >
          <ChevronLeft className="w-5 h-5 inline mr-1" />
          Voltar
        </button>
        <button
          onClick={() => setStep('review')}
          className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Revisar e Finalizar
          <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    </div>
  );

  const renderReview = () => {
    const totalEstimatedCost = damages.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

    return (
      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Revisar Vistoria
          </h3>
          <p className="text-sm text-slate-600">
            Confira todos os dados antes de finalizar.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <ImageIcon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-900">{photos.length}</p>
            <p className="text-xs text-blue-700">Fotos</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <Gauge className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-900">{odometerReading?.toLocaleString()}</p>
            <p className="text-xs text-purple-700">km</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <Fuel className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-900">{fuelLevel}%</p>
            <p className="text-xs text-green-700">Combustível</p>
          </div>
        </div>

        {/* Damages Summary */}
        {damages.length > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {damages.length} Dano(s) Registrado(s)
            </h4>
            <div className="space-y-2">
              {damages.map((damage, i) => (
                <div key={i} className="bg-white rounded-lg p-3 text-sm">
                  <p className="font-bold text-slate-900">{damage.location}</p>
                  <p className="text-slate-600 text-xs">{damage.description}</p>
                  {damage.estimatedCost && (
                    <p className="text-red-600 font-bold text-xs mt-1">
                      Custo estimado: R$ {damage.estimatedCost.toFixed(2)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {totalEstimatedCost > 0 && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm font-bold text-red-900">
                  Total estimado de reparos: R$ {totalEstimatedCost.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-900">Veículo em Perfeito Estado!</p>
            <p className="text-sm text-green-700">Nenhum dano registrado.</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Observações Adicionais (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Qualquer informação relevante..."
            rows={3}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        {/* Location and Weather */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Local
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ex: Garagem Centro"
              className="w-full p-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Clima
            </label>
            <select
              value={weather}
              onChange={e => setWeather(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="">Selecione</option>
              <option value="sunny">Ensolarado</option>
              <option value="cloudy">Nublado</option>
              <option value="rainy">Chovendo</option>
              <option value="stormy">Tempestade</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => setStep('damages')}
            className="flex-1 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition"
          >
            <ChevronLeft className="w-5 h-5 inline mr-1" />
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Finalizar Vistoria
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER MAIN
  // ============================================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {isCheckIn ? 'Check-in' : 'Check-out'} - Vistoria
            </h2>
            <p className="text-indigo-100 text-sm">
              {car.make} {car.model} {car.year}
            </p>
          </div>
          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {['intro', 'photos', 'odometer', 'fuel', 'damages', 'review'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-all ${
                  ['intro', 'photos', 'odometer', 'fuel', 'damages', 'review'].indexOf(step) >= i
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {step === 'intro' && renderIntro()}
          {step === 'photos' && renderPhotos()}
          {step === 'odometer' && renderOdometer()}
          {step === 'fuel' && renderFuel()}
          {step === 'damages' && renderDamages()}
          {step === 'review' && renderReview()}
        </div>
      </div>
    </div>
  );
};
