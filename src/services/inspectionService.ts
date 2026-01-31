// ============================================================
// VELOCITY - FASE 1: Serviço de Vistorias de Veículos
// ============================================================
// Check-in/Check-out com fotos para evitar disputas
// ============================================================

import { supabase } from '../lib/supabase';
import {
  VehicleInspection,
  InspectionPhoto,
  VehicleDamage,
  InspectionComparison,
  InspectionFormData,
  InspectionFilters
} from '../types-fase1';

// ============================================================
// CRIAÇÃO DE VISTORIAS
// ============================================================

/**
 * Cria uma nova vistoria (check-in ou check-out)
 */
export const createInspection = async (
  formData: InspectionFormData,
  inspectorId: string,
  inspectorName: string
): Promise<VehicleInspection | null> => {
  const { data, error } = await supabase
    .from('vehicle_inspections')
    .insert([{
      rental_id: formData.rentalId,
      inspection_type: formData.inspectionType,
      photos: JSON.stringify([]), // Será atualizado após upload de fotos
      odometer_reading: formData.odometerReading,
      fuel_level: formData.fuelLevel,
      damages: JSON.stringify(formData.damages),
      notes: formData.notes,
      inspector_id: inspectorId,
      inspector_name: inspectorName,
      location: formData.location,
      weather_conditions: formData.weatherConditions
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating inspection:', error);
    return null;
  }

  return mapInspection(data);
};

// ============================================================
// UPLOAD DE FOTOS
// ============================================================

/**
 * Faz upload de foto de vistoria para o Supabase Storage
 */
export const uploadInspectionPhoto = async (
  file: File,
  rentalId: string,
  inspectionType: 'check_in' | 'check_out',
  photoType: InspectionPhoto['type']
): Promise<string | null> => {
  const fileName = `${rentalId}-${inspectionType}-${photoType}-${Date.now()}.${file.name.split('.').pop()}`;
  const filePath = `inspections/${rentalId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('contracts') // Usando bucket existente
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading inspection photo:', error);
    return null;
  }

  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from('contracts')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};

/**
 * Adiciona fotos a uma vistoria existente
 */
export const addPhotosToInspection = async (
  inspectionId: string,
  photos: InspectionPhoto[]
): Promise<boolean> => {
  // Buscar fotos existentes
  const { data: existing } = await supabase
    .from('vehicle_inspections')
    .select('photos')
    .eq('id', inspectionId)
    .single();

  const existingPhotos = existing?.photos ? JSON.parse(existing.photos) : [];
  const allPhotos = [...existingPhotos, ...photos];

  const { error } = await supabase
    .from('vehicle_inspections')
    .update({
      photos: JSON.stringify(allPhotos)
    })
    .eq('id', inspectionId);

  if (error) {
    console.error('Error adding photos to inspection:', error);
    return false;
  }

  return true;
};

// ============================================================
// QUERIES
// ============================================================

/**
 * Busca vistorias de um aluguel específico
 */
export const getInspectionsByRental = async (
  rentalId: string
): Promise<{ checkIn?: VehicleInspection; checkOut?: VehicleInspection }> => {
  const { data, error } = await supabase
    .from('vehicle_inspections')
    .select('*')
    .eq('rental_id', rentalId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching inspections:', error);
    return {};
  }

  const inspections = (data || []).map(mapInspection);

  return {
    checkIn: inspections.find(i => i.inspectionType === 'check_in'),
    checkOut: inspections.find(i => i.inspectionType === 'check_out')
  };
};

/**
 * Busca todas as vistorias com filtros
 */
export const getAllInspections = async (
  filters?: InspectionFilters
): Promise<VehicleInspection[]> => {
  let query = supabase
    .from('vehicle_inspections')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.rentalId) {
    query = query.eq('rental_id', filters.rentalId);
  }

  if (filters?.type) {
    query = query.eq('inspection_type', filters.type);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inspections:', error);
    return [];
  }

  return (data || []).map(mapInspection);
};

// ============================================================
// COMPARAÇÃO DE VISTORIAS
// ============================================================

/**
 * Compara check-in e check-out para identificar novos danos
 */
export const compareInspections = async (
  rentalId: string
): Promise<InspectionComparison | null> => {
  const { checkIn, checkOut } = await getInspectionsByRental(rentalId);

  if (!checkIn || !checkOut) {
    return null;
  }

  // Identificar novos danos (existem no check-out mas não no check-in)
  const checkInDamageIds = new Set(checkIn.damages.map(d => d.location + d.type));
  const newDamages = checkOut.damages.filter(
    d => !checkInDamageIds.has(d.location + d.type)
  );

  // Calcular diferenças
  const odometerDifference = checkOut.odometerReading && checkIn.odometerReading
    ? checkOut.odometerReading - checkIn.odometerReading
    : undefined;

  const fuelDifference = checkOut.fuelLevel !== undefined && checkIn.fuelLevel !== undefined
    ? checkOut.fuelLevel - checkIn.fuelLevel
    : undefined;

  // Estimar custo de reparos
  const estimatedRepairCost = newDamages.reduce((total, damage) => {
    return total + (damage.estimatedCost || 0);
  }, 0);

  return {
    checkIn,
    checkOut,
    newDamages,
    odometerDifference,
    fuelDifference,
    estimatedRepairCost
  };
};

// ============================================================
// VALIDAÇÕES
// ============================================================

/**
 * Verifica se um aluguel tem check-in completo
 */
export const hasCheckIn = async (rentalId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('vehicle_inspections')
    .select('id')
    .eq('rental_id', rentalId)
    .eq('inspection_type', 'check_in')
    .maybeSingle();

  return !!data;
};

/**
 * Verifica se um aluguel tem check-out completo
 */
export const hasCheckOut = async (rentalId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('vehicle_inspections')
    .select('id')
    .eq('rental_id', rentalId)
    .eq('inspection_type', 'check_out')
    .maybeSingle();

  return !!data;
};

/**
 * Verifica se vistoria está completa (mínimo de fotos obrigatórias)
 */
export const isInspectionComplete = (inspection: VehicleInspection): boolean => {
  // Validações mínimas
  const hasMinPhotos = inspection.photos.length >= 5;
  const hasOdometer = inspection.odometerReading !== undefined;
  const hasFuelLevel = inspection.fuelLevel !== undefined;

  return hasMinPhotos && hasOdometer && hasFuelLevel;
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Mapeia dados do Supabase para o tipo VehicleInspection
 */
const mapInspection = (data: any): VehicleInspection => {
  const photos = typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos || [];
  const damages = typeof data.damages === 'string' ? JSON.parse(data.damages) : data.damages || [];

  return {
    id: data.id,
    rentalId: data.rental_id,
    inspectionType: data.inspection_type,
    photos,
    odometerReading: data.odometer_reading,
    fuelLevel: data.fuel_level,
    damages,
    notes: data.notes,
    signatureUrl: data.signature_url,
    inspectorId: data.inspector_id,
    inspectorName: data.inspector_name,
    location: data.location,
    weatherConditions: data.weather_conditions,
    createdAt: data.created_at
  };
};

/**
 * Gera ID único para danos
 */
export const generateDamageId = (): string => {
  return `dmg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Gera ID único para fotos
 */
export const generatePhotoId = (): string => {
  return `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Estima custo de reparo baseado na severidade
 */
export const estimateDamageCost = (
  damageType: VehicleDamage['type'],
  severity: VehicleDamage['severity']
): number => {
  const baseCosts: Record<VehicleDamage['type'], number> = {
    scratch: 150,
    dent: 300,
    crack: 400,
    missing_part: 500,
    stain: 100,
    other: 200
  };

  const severityMultipliers: Record<VehicleDamage['severity'], number> = {
    minor: 1,
    moderate: 2,
    severe: 4
  };

  return baseCosts[damageType] * severityMultipliers[severity];
};

/**
 * Formata leitura do hodômetro
 */
export const formatOdometer = (reading: number): string => {
  return `${reading.toLocaleString('pt-BR')} km`;
};

/**
 * Formata nível de combustível
 */
export const formatFuelLevel = (level: number): string => {
  if (level >= 90) return 'Tanque Cheio';
  if (level >= 70) return '3/4 do Tanque';
  if (level >= 40) return 'Meio Tanque';
  if (level >= 20) return '1/4 do Tanque';
  return 'Tanque Vazio';
};
