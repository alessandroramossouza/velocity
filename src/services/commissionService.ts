// ============================================================
// VELOCITY - FASE 1: Serviço de Comissões
// ============================================================
// Sistema automatizado de cálculo e gestão de comissões da plataforma
// ============================================================

import { supabase } from '../lib/supabase';
import { PlatformEarning, CommissionCalculation, CommissionFilters } from '../types-fase1';

const DEFAULT_COMMISSION_RATE = 15; // 15% padrão

// ============================================================
// CÁLCULO DE COMISSÕES
// ============================================================

/**
 * Calcula a comissão da plataforma sobre um valor bruto
 */
export const calculateCommission = (
  grossAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): CommissionCalculation => {
  const commissionAmount = Math.round(grossAmount * (commissionRate / 100) * 100) / 100;
  const netToOwner = Math.round((grossAmount - commissionAmount) * 100) / 100;

  return {
    grossAmount,
    commissionPercentage: commissionRate,
    commissionAmount,
    netToOwner
  };
};

/**
 * Cria um registro de comissão para um aluguel
 */
export const createPlatformEarning = async (
  rentalId: string,
  grossAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): Promise<PlatformEarning> => {
  const calculation = calculateCommission(grossAmount, commissionRate);

  const { data, error } = await supabase
    .from('platform_earnings')
    .insert([{
      rental_id: rentalId,
      gross_amount: calculation.grossAmount,
      commission_percentage: calculation.commissionPercentage,
      commission_amount: calculation.commissionAmount,
      net_to_owner: calculation.netToOwner,
      status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating platform earning:', error);
    throw new Error('Falha ao criar registro de comissão');
  }

  return mapPlatformEarning(data);
};

// ============================================================
// QUERIES
// ============================================================

/**
 * Busca todas as comissões da plataforma
 */
export const getAllPlatformEarnings = async (
  filters?: CommissionFilters
): Promise<PlatformEarning[]> => {
  let query = supabase
    .from('platform_earnings')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters?.minAmount) {
    query = query.gte('commission_amount', filters.minAmount);
  }

  if (filters?.maxAmount) {
    query = query.lte('commission_amount', filters.maxAmount);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching platform earnings:', error);
    return [];
  }

  return (data || []).map(mapPlatformEarning);
};

/**
 * Busca comissões de um locador específico
 */
export const getOwnerEarnings = async (ownerId: string): Promise<PlatformEarning[]> => {
  // Buscar rentals do owner
  const { data: rentals } = await supabase
    .from('rentals')
    .select('id')
    .eq('owner_id', ownerId);

  if (!rentals || rentals.length === 0) return [];

  const rentalIds = rentals.map(r => r.id);

  const { data, error } = await supabase
    .from('platform_earnings')
    .select('*')
    .in('rental_id', rentalIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching owner earnings:', error);
    return [];
  }

  return (data || []).map(mapPlatformEarning);
};

/**
 * Busca estatísticas de comissões
 */
export const getPlatformCommissionStats = async (
  startDate?: string,
  endDate?: string
) => {
  let query = supabase
    .from('platform_earnings')
    .select('*');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching commission stats:', error);
    return null;
  }

  const earnings = data || [];

  return {
    totalTransactions: earnings.length,
    totalGross: earnings.reduce((sum, e) => sum + Number(e.gross_amount || 0), 0),
    totalCommission: earnings.reduce((sum, e) => sum + Number(e.commission_amount || 0), 0),
    totalNetToOwners: earnings.reduce((sum, e) => sum + Number(e.net_to_owner || 0), 0),
    averageCommissionRate: earnings.length > 0
      ? earnings.reduce((sum, e) => sum + Number(e.commission_percentage || 0), 0) / earnings.length
      : DEFAULT_COMMISSION_RATE,
    pendingCommissions: earnings.filter(e => e.status === 'pending').length,
    processedCommissions: earnings.filter(e => e.status === 'processed').length,
    paidCommissions: earnings.filter(e => e.status === 'paid').length
  };
};

// ============================================================
// AÇÕES DE GESTÃO
// ============================================================

/**
 * Marca comissões como processadas
 */
export const processCommissions = async (earningIds: string[]): Promise<boolean> => {
  const { error } = await supabase
    .from('platform_earnings')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString()
    })
    .in('id', earningIds);

  if (error) {
    console.error('Error processing commissions:', error);
    return false;
  }

  return true;
};

/**
 * Marca comissões como pagas
 */
export const markCommissionsAsPaid = async (earningIds: string[]): Promise<boolean> => {
  const { error } = await supabase
    .from('platform_earnings')
    .update({
      status: 'paid'
    })
    .in('id', earningIds);

  if (error) {
    console.error('Error marking commissions as paid:', error);
    return false;
  }

  return true;
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Mapeia dados do Supabase para o tipo PlatformEarning
 */
const mapPlatformEarning = (data: any): PlatformEarning => ({
  id: data.id,
  rentalId: data.rental_id,
  grossAmount: Number(data.gross_amount || 0),
  commissionPercentage: Number(data.commission_percentage || DEFAULT_COMMISSION_RATE),
  commissionAmount: Number(data.commission_amount || 0),
  netToOwner: Number(data.net_to_owner || 0),
  status: data.status || 'pending',
  processedAt: data.processed_at,
  createdAt: data.created_at
});

/**
 * Formata valor monetário para exibição
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata porcentagem para exibição
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};
