// ============================================================
// VELOCITY - FASE 1: Novos Tipos TypeScript
// ============================================================
// Este arquivo contém os tipos para as novas funcionalidades da Fase 1
// SEM ALTERAR os tipos existentes em types.ts
// ============================================================

// ============================================================
// 1. SISTEMA DE COMISSÕES
// ============================================================

export interface PlatformEarning {
  id: string;
  rentalId: string;
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  netToOwner: number;
  status: 'pending' | 'processed' | 'paid';
  processedAt?: string;
  createdAt: string;
}

export interface CommissionCalculation {
  grossAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  netToOwner: number;
}

// ============================================================
// 2. PROGRAMA DE INDICAÇÃO
// ============================================================

export interface Referral {
  id: string;
  referrerId: string;
  referredId?: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'rewarded';
  rewardAmount: number;
  rewardPaidAt?: string;
  createdAt: string;
  completedAt?: string;
  // Joined data
  referrerName?: string;
  referrerEmail?: string;
  referredName?: string;
  referredEmail?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  totalRewardsPaid: number;
  referralCode: string;
}

// ============================================================
// 3. VISTORIA DE VEÍCULOS (CHECK-IN/CHECK-OUT)
// ============================================================

export interface VehicleInspection {
  id: string;
  rentalId: string;
  inspectionType: 'check_in' | 'check_out';
  photos: InspectionPhoto[];
  odometerReading?: number;
  fuelLevel?: number; // 0-100
  damages: VehicleDamage[];
  notes?: string;
  signatureUrl?: string;
  inspectorId: string;
  inspectorName?: string;
  location?: string;
  weatherConditions?: string;
  createdAt: string;
}

export interface InspectionPhoto {
  id: string;
  url: string;
  type: 'front' | 'back' | 'left' | 'right' | 'interior' | 'dashboard' | 'damage' | 'other';
  description?: string;
  timestamp: string;
}

export interface VehicleDamage {
  id: string;
  location: string; // ex: "Para-choque dianteiro esquerdo"
  type: 'scratch' | 'dent' | 'crack' | 'missing_part' | 'stain' | 'other';
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  photoUrl?: string;
  estimatedCost?: number;
}

export interface InspectionComparison {
  checkIn?: VehicleInspection;
  checkOut?: VehicleInspection;
  newDamages: VehicleDamage[];
  odometerDifference?: number;
  fuelDifference?: number;
  estimatedRepairCost: number;
}

// ============================================================
// 4. DASHBOARD FINANCEIRO AVANÇADO
// ============================================================

export interface OwnerFinancialStats {
  id: string;
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalRentals: number;
  averageDailyRate: number;
  occupancyRate: number; // 0-100
  conversionRate: number; // 0-100
  topPerformingCarId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialMetrics {
  // Receita
  totalRevenue: number;
  projectedRevenue: number;
  revenueByMonth: { month: string; revenue: number }[];
  revenueByVehicle: { carId: number; carName: string; revenue: number }[];
  
  // Ocupação
  averageOccupancyRate: number;
  occupancyByVehicle: { carId: number; carName: string; rate: number }[];
  totalDaysBooked: number;
  totalDaysAvailable: number;
  
  // Conversão
  totalProposals: number;
  approvedProposals: number;
  conversionRate: number;
  
  // Comparação
  marketAveragePrice: number;
  yourAveragePrice: number;
  priceDifference: number;
  
  // Projeções
  nextMonthProjection: number;
  next3MonthsProjection: number;
  
  // Top performers
  bestPerformingCar?: {
    carId: number;
    name: string;
    revenue: number;
    occupancyRate: number;
  };
  
  worstPerformingCar?: {
    carId: number;
    name: string;
    revenue: number;
    occupancyRate: number;
  };
}

export interface PricingSuggestion {
  carId: number;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  potentialRevenueIncrease: number;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// 5. AUDITORIA E LOGS
// ============================================================

export interface SystemAuditLog {
  id: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditEventType =
  | 'user_login'
  | 'user_register'
  | 'car_created'
  | 'car_updated'
  | 'rental_created'
  | 'rental_approved'
  | 'rental_rejected'
  | 'payment_processed'
  | 'commission_calculated'
  | 'referral_completed'
  | 'inspection_created'
  | 'dispute_opened'
  | 'dispute_resolved';

// ============================================================
// 6. DASHBOARDS E ANALYTICS
// ============================================================

export interface PlatformMetrics {
  // Financeiro
  totalRevenue: number;
  platformCommission: number;
  ownerPayouts: number;
  
  // Usuários
  totalUsers: number;
  activeOwners: number;
  activeRenters: number;
  
  // Atividade
  totalRentals: number;
  activeRentals: number;
  completedRentals: number;
  
  // Crescimento
  userGrowthRate: number;
  revenueGrowthRate: number;
  
  // Indicações
  totalReferrals: number;
  conversionRate: number;
  
  // Top performers
  topOwners: Array<{
    ownerId: string;
    name: string;
    totalRevenue: number;
    totalRentals: number;
  }>;
  
  topCars: Array<{
    carId: number;
    name: string;
    totalRevenue: number;
    occupancyRate: number;
  }>;
}

// ============================================================
// 7. NOTIFICAÇÕES ESPECÍFICAS DA FASE 1
// ============================================================

export type Fase1NotificationType =
  | 'commission_processed'
  | 'referral_reward'
  | 'inspection_required'
  | 'inspection_completed'
  | 'damage_reported'
  | 'financial_report_ready'
  | 'pricing_suggestion';

export interface Fase1Notification {
  id: string;
  userId: string;
  type: Fase1NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ============================================================
// 8. FILTROS E QUERIES
// ============================================================

export interface FinancialReportFilters {
  ownerId?: string;
  startDate?: string;
  endDate?: string;
  carId?: number;
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export interface InspectionFilters {
  rentalId?: string;
  carId?: number;
  type?: 'check_in' | 'check_out';
  startDate?: string;
  endDate?: string;
  hasDamages?: boolean;
}

export interface CommissionFilters {
  status?: 'pending' | 'processed' | 'paid';
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ============================================================
// 9. RESPOSTAS DE API
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// 10. FORMULÁRIOS E INPUTS
// ============================================================

export interface InspectionFormData {
  rentalId: string;
  inspectionType: 'check_in' | 'check_out';
  odometerReading?: number;
  fuelLevel?: number;
  damages: Omit<VehicleDamage, 'id'>[];
  notes?: string;
  location?: string;
  weatherConditions?: string;
}

export interface ReferralRedemption {
  code: string;
  newUserId: string;
  newUserEmail: string;
}

// ============================================================
// HELPERS E UTILITÁRIOS
// ============================================================

export const COMMISSION_RATES = {
  DEFAULT: 15,
  PREMIUM: 10,
  ENTERPRISE: 5
} as const;

export const REFERRAL_REWARDS = {
  REFERRER: 50,
  REFERRED: 50
} as const;

export const FUEL_LEVELS = {
  EMPTY: 0,
  QUARTER: 25,
  HALF: 50,
  THREE_QUARTERS: 75,
  FULL: 100
} as const;

export const DAMAGE_SEVERITY_COSTS = {
  minor: { min: 50, max: 200 },
  moderate: { min: 200, max: 1000 },
  severe: { min: 1000, max: 5000 }
} as const;
