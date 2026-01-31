import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, Car } from '../types';
import {
  Camera, Check, X, AlertTriangle, Loader2, ChevronRight, ChevronLeft,
  Car as CarIcon, Upload, Eye, CheckCircle, Clock, FileText
} from 'lucide-react';

// Required angles for complete inspection
const REQUIRED_ANGLES = [
  { id: 'front', label: 'Frente', description: 'Foto frontal completa do veículo', icon: '🚗' },
  { id: 'back', label: 'Traseira', description: 'Foto traseira completa', icon: '🔙' },
  { id: 'left', label: 'Lateral Esquerda', description: 'Lado do motorista completo', icon: '⬅️' },
  { id: 'right', label: 'Lateral Direita', description: 'Lado do passageiro completo', icon: '➡️' },
  { id: 'front_left', label: 'Dianteira Esquerda', description: 'Ângulo diagonal frontal esquerdo', icon: '↖️' },
  { id: 'front_right', label: 'Dianteira Direita', description: 'Ângulo diagonal frontal direito', icon: '↗️' },
  { id: 'back_left', label: 'Traseira Esquerda', description: 'Ângulo diagonal traseiro esquerdo', icon: '↙️' },
  { id: 'back_right', label: 'Traseira Direita', description: 'Ângulo diagonal traseiro direito', icon: '↘️' },
  { id: 'interior', label: 'Interior', description: 'Visão geral do interior (bancos, painel)', icon: '🪑' },
  { id: 'dashboard', label: 'Painel/Hodômetro', description: 'Foto do painel com quilometragem visível', icon: '📊' },
];

interface InspectionPhoto {
  angle: string;
  file: File | null;
  previewUrl: string | null;
  uploadedUrl?: string;
  hasDamage: boolean;
  damageDescription: string;
}

interface VehicleInspectionProps {
  rentalId: string;
  carId: string;
  car: Car;
  inspectorId: string;
  inspectorName: string;
  inspectionType: 'check_in' | 'check_out';
  onComplete: (inspectionId: string) => void;
  onClose: () => void;
}

export const VehicleInspection: React.FC<VehicleInspectionProps> = ({
  rentalId,
  carId,
  car,
  inspectorId,
  inspectorName,
  inspectionType,
  onComplete,
  onClose
}) => {
  const [step, setStep] = useState<'intro' | 'photos' | 'review' | 'submitting' | 'complete'>('intro');
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [photos, setPhotos] = useState<InspectionPhoto[]>(
    REQUIRED_ANGLES.map(angle => ({
      angle: angle.id,
      file: null,
      previewUrl: null,
      hasDamage: false,
      damageDescription: ''
    }))
  );
  const [generalNotes, setGeneralNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectionId, setInspectionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAngle = REQUIRED_ANGLES[currentAngleIndex];
  const currentPhoto = photos[currentAngleIndex];
  const completedPhotos = photos.filter(p => p.file !== null).length;
  const progress = (completedPhotos / REQUIRED_ANGLES.length) * 100;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas imagens.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 10MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setPhotos(prev => prev.map((p, i) =>
      i === currentAngleIndex
        ? { ...p, file, previewUrl }
        : p
    ));

    setError(null);
  };

  const handleDamageToggle = (hasDamage: boolean) => {
    setPhotos(prev => prev.map((p, i) =>
      i === currentAngleIndex
        ? { ...p, hasDamage, damageDescription: hasDamage ? p.damageDescription : '' }
        : p
    ));
  };

  const handleDamageDescription = (description: string) => {
    setPhotos(prev => prev.map((p, i) =>
      i === currentAngleIndex
        ? { ...p, damageDescription: description }
        : p
    ));
  };

  const goToNextAngle = () => {
    if (currentAngleIndex < REQUIRED_ANGLES.length - 1) {
      setCurrentAngleIndex(prev => prev + 1);
    } else {
      setStep('review');
    }
  };

  const goToPrevAngle = () => {
    if (currentAngleIndex > 0) {
      setCurrentAngleIndex(prev => prev - 1);
    }
  };

  const canProceed = currentPhoto.file !== null;
  const allPhotosComplete = photos.every(p => p.file !== null);

  const uploadPhotosAndSubmit = async () => {
    setStep('submitting');
    setUploading(true);
    setError(null);

    try {
      // 1. Create inspection record
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          rental_id: rentalId,
          car_id: carId,
          inspector_id: inspectorId,
          inspection_type: inspectionType,
          status: 'completed',
          notes: generalNotes,
          damage_report: photos
            .filter(p => p.hasDamage)
            .map(p => ({
              angle: p.angle,
              description: p.damageDescription
            })),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      setInspectionId(inspection.id);

      // 2. Upload each photo
      for (const photo of photos) {
        if (!photo.file) continue;

        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${inspection.id}_${photo.angle}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('inspections')
          .upload(fileName, photo.file);

        if (uploadError) {
          console.error('Upload error for', photo.angle, uploadError);
          // Continue with other photos even if one fails
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('inspections')
          .getPublicUrl(fileName);

        // 3. Save photo record
        await supabase.from('inspection_photos').insert({
          inspection_id: inspection.id,
          photo_url: urlData.publicUrl,
          angle: photo.angle,
          has_damage: photo.hasDamage,
          damage_description: photo.damageDescription || null
        });
      }

      setStep('complete');

    } catch (err: any) {
      console.error('Inspection error:', err);
      setError(err.message || 'Erro ao salvar vistoria.');
      setStep('review');
    } finally {
      setUploading(false);
    }
  };

  // Render: Introduction
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Vistoria Digital</h2>
                <p className="text-emerald-100 text-sm">
                  {inspectionType === 'check_in' ? 'Check-in do Veículo' : 'Check-out do Veículo'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <CarIcon className="w-5 h-5 text-slate-600" />
                <span className="font-bold text-slate-900">{car.make} {car.model} ({car.year})</span>
              </div>
              <p className="text-sm text-slate-600">
                Inspetor: <strong>{inspectorName}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">📸 Como funciona:</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Tire <strong>10 fotos obrigatórias</strong> do veículo em ângulos específicos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Marque qualquer <strong>dano existente</strong> que encontrar</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Revise e envie a vistoria completa</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Importante:</strong> As fotos serão usadas para comparar o estado do veículo
                no início e fim do aluguel. Capriche na qualidade!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('photos')}
                className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                Iniciar Vistoria
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render: Photo Capture
  if (step === 'photos') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
          {/* Header with Progress */}
          <div className="bg-slate-900 p-4 text-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentAngle.icon}</span>
                <div>
                  <h3 className="font-bold">{currentAngle.label}</h3>
                  <p className="text-slate-400 text-xs">{currentAngleIndex + 1} de {REQUIRED_ANGLES.length}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Photo Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <p className="text-sm text-slate-600 text-center">{currentAngle.description}</p>

            {/* Photo Preview or Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative aspect-video rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition ${currentPhoto.previewUrl
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
            >
              {currentPhoto.previewUrl ? (
                <>
                  <img
                    src={currentPhoto.previewUrl}
                    alt={currentAngle.label}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs p-2 text-center">
                    Toque para trocar a foto
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Toque para tirar foto</span>
                  <span className="text-xs">ou selecionar da galeria</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Damage Toggle */}
            {currentPhoto.file && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">Há algum dano visível neste ângulo?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDamageToggle(false)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${!currentPhoto.hasDamage
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                    >
                      Não
                    </button>
                    <button
                      onClick={() => handleDamageToggle(true)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${currentPhoto.hasDamage
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>

                {currentPhoto.hasDamage && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Descreva o dano encontrado:
                    </label>
                    <textarea
                      value={currentPhoto.damageDescription}
                      onChange={(e) => handleDamageDescription(e.target.value)}
                      placeholder="Ex: Risco na porta dianteira de aproximadamente 5cm"
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
            <button
              onClick={goToPrevAngle}
              disabled={currentAngleIndex === 0}
              className="p-3 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextAngle}
              disabled={!canProceed}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {currentAngleIndex === REQUIRED_ANGLES.length - 1 ? (
                <>Revisar Vistoria</>
              ) : (
                <>Próximo Ângulo <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Review
  if (step === 'review') {
    const damagesCount = photos.filter(p => p.hasDamage).length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6" />
              Revisar Vistoria
            </h2>
            <p className="text-indigo-200 text-sm mt-1">Confira as fotos antes de enviar</p>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{completedPhotos}</p>
                <p className="text-xs text-emerald-700">Fotos Capturadas</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${damagesCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}>
                <p className={`text-3xl font-bold ${damagesCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {damagesCount}
                </p>
                <p className={`text-xs ${damagesCount > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  Danos Registrados
                </p>
              </div>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.angle}
                  onClick={() => { setCurrentAngleIndex(index); setStep('photos'); }}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative border-2 ${photo.file ? 'border-emerald-500' : 'border-slate-200'
                    }`}
                >
                  {photo.previewUrl ? (
                    <img src={photo.previewUrl} alt={photo.angle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  {photo.hasDamage && (
                    <div className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* General Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Observações Gerais (opcional)
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Ex: Veículo limpo, tanque cheio, pequeno amassado no para-choque traseiro já existente..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm resize-none"
                rows={3}
              />
            </div>

            {!allPhotosComplete && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Atenção:</strong> Você ainda não completou todas as {REQUIRED_ANGLES.length} fotos obrigatórias.
                  Toque em uma foto para editá-la.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
            <button
              onClick={() => { setCurrentAngleIndex(0); setStep('photos'); }}
              className="flex-1 py-3 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </button>
            <button
              onClick={uploadPhotosAndSubmit}
              disabled={!allPhotosComplete}
              className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Enviar Vistoria
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Submitting
  if (step === 'submitting') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Enviando Vistoria...</h3>
          <p className="text-slate-500 text-sm">
            Fazendo upload das {completedPhotos} fotos. Por favor, aguarde.
          </p>
        </div>
      </div>
    );
  }

  // Render: Complete
  if (step === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Vistoria Concluída!</h3>
          <p className="text-slate-500 text-sm mb-6">
            {inspectionType === 'check_in'
              ? 'O veículo foi inspecionado e está pronto para uso.'
              : 'A vistoria de devolução foi registrada com sucesso.'
            }
          </p>
          <div className="bg-slate-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-slate-600">
              <strong>ID da Vistoria:</strong> {inspectionId?.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={() => onComplete(inspectionId || '')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default VehicleInspection;
