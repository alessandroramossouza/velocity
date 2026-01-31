// ============================================================
// VELOCITY - FASE 1: Serviço Financeiro Avançado
// ============================================================
// Dashboard financeiro com métricas, projeções e análises
// ============================================================

import { supabase } from '../lib/supabase';
import { FinancialMetrics, PricingSuggestion, FinancialReportFilters } from '../types-fase1';
import { Car, Rental } from '../types';

// ============================================================
// MÉTRICAS FINANCEIRAS
// ============================================================

/**
 * Calcula métricas financeiras completas para um locador
 */
export const getOwnerFinancialMetrics = async (
  ownerId: string,
  filters?: FinancialReportFilters
): Promise<FinancialMetrics | null> => {
  try {
    // Buscar carros do locador
    const { data: cars } = await supabase
      .from('cars')
      .select('*')
      .eq('owner_id', ownerId);

    if (!cars || cars.length === 0) {
      return null;
    }

    const carIds = cars.map(c => c.id);

    // Buscar aluguéis
    let rentalsQuery = supabase
      .from('rentals')
      .select('*')
      .eq('owner_id', ownerId)
      .in('status', ['active', 'completed']);

    if (filters?.startDate) {
      rentalsQuery = rentalsQuery.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      rentalsQuery = rentalsQuery.lte('created_at', filters.endDate);
    }

    if (filters?.carId) {
      rentalsQuery = rentalsQuery.eq('car_id', filters.carId);
    }

    const { data: rentals } = await rentalsQuery;
    const completedRentals = (rentals || []).filter(r => r.status === 'completed');

    // Buscar propostas
    const { data: proposals } = await supabase
      .from('rentals')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('status', 'proposal_submitted');

    // Calcular receita
    const totalRevenue = completedRentals.reduce((sum, r) => sum + Number(r.total_price || 0), 0);

    // Receita por mês (últimos 6 meses)
    const revenueByMonth = calculateRevenueByMonth(completedRentals);

    // Receita por veículo
    const revenueByVehicle = calculateRevenueByVehicle(completedRentals, cars);

    // Taxa de ocupação
    const occupancyMetrics = calculateOccupancyRate(rentals || [], cars, filters);

    // Taxa de conversão
    const totalProposals = (proposals || []).length;
    const approvedProposals = completedRentals.length;
    const conversionRate = totalProposals > 0
      ? (approvedProposals / totalProposals) * 100
      : 0;

    // Projeções
    const projections = calculateProjections(completedRentals, cars);

    // Top e bottom performers
    const performers = identifyPerformers(revenueByVehicle, occupancyMetrics.byVehicle);

    // Média de preço do mercado (simulado com IA)
    const marketComparison = await compareWithMarket(cars);

    return {
      totalRevenue,
      projectedRevenue: projections.nextMonth,
      revenueByMonth,
      revenueByVehicle,
      averageOccupancyRate: occupancyMetrics.average,
      occupancyByVehicle: occupancyMetrics.byVehicle,
      totalDaysBooked: occupancyMetrics.totalBooked,
      totalDaysAvailable: occupancyMetrics.totalAvailable,
      totalProposals,
      approvedProposals,
      conversionRate,
      marketAveragePrice: marketComparison.marketAverage,
      yourAveragePrice: marketComparison.yourAverage,
      priceDifference: marketComparison.difference,
      nextMonthProjection: projections.nextMonth,
      next3MonthsProjection: projections.next3Months,
      bestPerformingCar: performers.best,
      worstPerformingCar: performers.worst
    };
  } catch (error) {
    console.error('Error calculating financial metrics:', error);
    return null;
  }
};

// ============================================================
// CÁLCULOS AUXILIARES
// ============================================================

/**
 * Calcula receita por mês
 */
const calculateRevenueByMonth = (rentals: any[]): { month: string; revenue: number }[] => {
  const monthlyData: Record<string, number> = {};

  rentals.forEach(rental => {
    const date = new Date(rental.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }

    monthlyData[monthKey] += Number(rental.total_price || 0);
  });

  return Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Últimos 6 meses
};

/**
 * Calcula receita por veículo
 */
const calculateRevenueByVehicle = (
  rentals: any[],
  cars: any[]
): { carId: number; carName: string; revenue: number }[] => {
  const vehicleRevenue: Record<number, number> = {};

  rentals.forEach(rental => {
    const carId = Number(rental.car_id);
    if (!vehicleRevenue[carId]) {
      vehicleRevenue[carId] = 0;
    }
    vehicleRevenue[carId] += Number(rental.total_price || 0);
  });

  return Object.entries(vehicleRevenue).map(([carIdStr, revenue]) => {
    const carId = Number(carIdStr);
    const car = cars.find(c => c.id === carId);
    return {
      carId,
      carName: car ? `${car.make} ${car.model}` : 'Veículo',
      revenue
    };
  }).sort((a, b) => b.revenue - a.revenue);
};

/**
 * Calcula taxa de ocupação
 */
const calculateOccupancyRate = (
  rentals: any[],
  cars: any[],
  filters?: FinancialReportFilters
) => {
  const now = new Date();
  const startOfMonth = filters?.startDate
    ? new Date(filters.startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = filters?.endDate
    ? new Date(filters.endDate)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const totalDays = Math.ceil((endOfMonth.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24));
  const totalDaysAvailable = totalDays * cars.length;

  let totalDaysBooked = 0;
  const byVehicle: { carId: number; carName: string; rate: number }[] = [];

  cars.forEach(car => {
    const carRentals = rentals.filter(r => Number(r.car_id) === car.id);
    let carDaysBooked = 0;

    carRentals.forEach(rental => {
      const start = new Date(rental.start_date);
      const end = new Date(rental.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      carDaysBooked += days;
    });

    totalDaysBooked += carDaysBooked;

    const carRate = totalDays > 0 ? (carDaysBooked / totalDays) * 100 : 0;

    byVehicle.push({
      carId: car.id,
      carName: `${car.make} ${car.model}`,
      rate: Math.min(carRate, 100) // Cap at 100%
    });
  });

  const averageRate = totalDaysAvailable > 0
    ? (totalDaysBooked / totalDaysAvailable) * 100
    : 0;

  return {
    average: Math.min(averageRate, 100),
    byVehicle: byVehicle.sort((a, b) => b.rate - a.rate),
    totalBooked: totalDaysBooked,
    totalAvailable: totalDaysAvailable
  };
};

/**
 * Calcula projeções de receita
 */
const calculateProjections = (rentals: any[], cars: any[]) => {
  // Média de receita mensal dos últimos 3 meses
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const recentRentals = rentals.filter(r => {
    const created = new Date(r.created_at);
    return created >= threeMonthsAgo;
  });

  const recentRevenue = recentRentals.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const monthlyAverage = recentRevenue / 3;

  // Projeção simples: média dos últimos 3 meses
  const nextMonthProjection = monthlyAverage;
  const next3MonthsProjection = monthlyAverage * 3;

  return {
    nextMonth: Math.round(nextMonthProjection),
    next3Months: Math.round(next3MonthsProjection)
  };
};

/**
 * Identifica melhores e piores performers
 */
const identifyPerformers = (
  revenueByVehicle: { carId: number; carName: string; revenue: number }[],
  occupancyByVehicle: { carId: number; carName: string; rate: number }[]
) => {
  if (revenueByVehicle.length === 0) {
    return { best: undefined, worst: undefined };
  }

  const best = revenueByVehicle[0];
  const worst = revenueByVehicle[revenueByVehicle.length - 1];

  return {
    best: {
      carId: best.carId,
      name: best.carName,
      revenue: best.revenue,
      occupancyRate: occupancyByVehicle.find(o => o.carId === best.carId)?.rate || 0
    },
    worst: worst.carId !== best.carId ? {
      carId: worst.carId,
      name: worst.carName,
      revenue: worst.revenue,
      occupancyRate: occupancyByVehicle.find(o => o.carId === worst.carId)?.rate || 0
    } : undefined
  };
};

/**
 * Compara preços com média do mercado
 */
const compareWithMarket = async (cars: any[]) => {
  const yourAveragePrice = cars.length > 0
    ? cars.reduce((sum, c) => sum + Number(c.price_per_day || 0), 0) / cars.length
    : 0;

  // Simulação de mercado (na prática, usar IA Gemini ou API externa)
  const marketAverage = yourAveragePrice * 1.15; // 15% acima como estimativa

  return {
    marketAverage,
    yourAverage: yourAveragePrice,
    difference: ((yourAveragePrice - marketAverage) / marketAverage) * 100
  };
};

// ============================================================
// SUGESTÕES DE PREÇO COM IA
// ============================================================

/**
 * Gera sugestões de preço para otimização de receita
 */
export const getPricingSuggestions = async (
  ownerId: string
): Promise<PricingSuggestion[]> => {
  const metrics = await getOwnerFinancialMetrics(ownerId);
  if (!metrics) return [];

  const suggestions: PricingSuggestion[] = [];

  // Sugestão baseada em ocupação
  metrics.occupancyByVehicle.forEach(vehicle => {
    const revenueData = metrics.revenueByVehicle.find(r => r.carId === vehicle.carId);
    if (!revenueData) return;

    if (vehicle.rate > 80) {
      // Alta demanda - aumentar preço
      const currentPrice = metrics.yourAveragePrice; // Simplificado
      const suggestedPrice = currentPrice * 1.15;
      const increase = (suggestedPrice - currentPrice) * 30; // 30 dias

      suggestions.push({
        carId: vehicle.carId,
        currentPrice,
        suggestedPrice,
        reason: `Alta ocupação (${vehicle.rate.toFixed(0)}%). Demanda permite aumento de 15%.`,
        potentialRevenueIncrease: increase,
        confidence: 'high'
      });
    } else if (vehicle.rate < 30) {
      // Baixa demanda - reduzir preço
      const currentPrice = metrics.yourAveragePrice;
      const suggestedPrice = currentPrice * 0.90;
      const increase = (currentPrice * 0.30 * 30) - (currentPrice * 30); // Assumindo 30% mais aluguéis

      suggestions.push({
        carId: vehicle.carId,
        currentPrice,
        suggestedPrice,
        reason: `Baixa ocupação (${vehicle.rate.toFixed(0)}%). Redução de 10% pode aumentar demanda em 30%.`,
        potentialRevenueIncrease: increase,
        confidence: 'medium'
      });
    }
  });

  return suggestions.sort((a, b) => b.potentialRevenueIncrease - a.potentialRevenueIncrease);
};

// ============================================================
// EXPORTAÇÃO DE RELATÓRIOS
// ============================================================

/**
 * Gera dados para exportação CSV
 */
export const generateFinancialReportCSV = async (
  ownerId: string,
  filters?: FinancialReportFilters
): Promise<string> => {
  let query = supabase
    .from('rentals')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'completed');

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data: rentals } = await query;

  if (!rentals || rentals.length === 0) {
    return 'Data,Veículo,Locatário,Dias,Valor,Status\n';
  }

  // Buscar carros e locatários
  const carIds = [...new Set(rentals.map(r => r.car_id))];
  const renterIds = [...new Set(rentals.map(r => r.renter_id))];

  const { data: cars } = await supabase.from('cars').select('*').in('id', carIds);
  const { data: renters } = await supabase.from('users').select('*').in('id', renterIds);

  // Gerar CSV
  let csv = 'Data,Veículo,Locatário,Dias,Valor,Status\n';

  rentals.forEach(rental => {
    const car = cars?.find(c => c.id === rental.car_id);
    const renter = renters?.find(r => r.id === rental.renter_id);
    const start = new Date(rental.start_date);
    const end = new Date(rental.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const line = [
      new Date(rental.created_at).toLocaleDateString('pt-BR'),
      car ? `${car.make} ${car.model}` : 'N/A',
      renter?.name || 'N/A',
      days,
      `R$ ${Number(rental.total_price || 0).toFixed(2)}`,
      rental.status
    ].join(',');

    csv += line + '\n';
  });

  return csv;
};

/**
 * Baixa relatório CSV
 */
export const downloadFinancialReport = async (
  ownerId: string,
  filters?: FinancialReportFilters
): Promise<void> => {
  const csv = await generateFinancialReportCSV(ownerId, filters);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================
// ANÁLISE COMPARATIVA
// ============================================================

/**
 * Compara performance entre períodos
 */
export const comparePerformance = async (
  ownerId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  previousPeriodStart: string,
  previousPeriodEnd: string
) => {
  const currentMetrics = await getOwnerFinancialMetrics(ownerId, {
    startDate: currentPeriodStart,
    endDate: currentPeriodEnd
  });

  const previousMetrics = await getOwnerFinancialMetrics(ownerId, {
    startDate: previousPeriodStart,
    endDate: previousPeriodEnd
  });

  if (!currentMetrics || !previousMetrics) {
    return null;
  }

  return {
    revenueGrowth: calculateGrowthPercentage(
      previousMetrics.totalRevenue,
      currentMetrics.totalRevenue
    ),
    occupancyGrowth: calculateGrowthPercentage(
      previousMetrics.averageOccupancyRate,
      currentMetrics.averageOccupancyRate
    ),
    conversionGrowth: calculateGrowthPercentage(
      previousMetrics.conversionRate,
      currentMetrics.conversionRate
    ),
    current: currentMetrics,
    previous: previousMetrics
  };
};

/**
 * Calcula percentual de crescimento
 */
const calculateGrowthPercentage = (previous: number, current: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// ============================================================
// FORMATAÇÃO E HELPERS
// ============================================================

/**
 * Formata valor monetário
 */
export const formatRevenue = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

/**
 * Formata taxa de ocupação
 */
export const formatOccupancyRate = (rate: number): string => {
  return `${rate.toFixed(1)}%`;
};

/**
 * Determina cor baseada em taxa de ocupação
 */
export const getOccupancyColor = (rate: number): string => {
  if (rate >= 70) return 'text-green-600';
  if (rate >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Determina cor baseada em crescimento
 */
export const getGrowthColor = (growth: number): string => {
  if (growth > 0) return 'text-green-600';
  if (growth === 0) return 'text-gray-600';
  return 'text-red-600';
};

/**
 * Formata número de dias
 */
export const formatDays = (days: number): string => {
  return `${days} ${days === 1 ? 'dia' : 'dias'}`;
};
