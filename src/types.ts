
export interface Car {
  id: string | number;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  category: 'SUV' | 'Sedan' | 'Hatchback' | 'Luxury' | 'Sports';
  pricePerDay: number;
  description: string;
  pricePerWeek?: number;
  pricePerMonth?: number;
  imageUrl: string;
  features: string[];
  isAvailable: boolean;
  averageRating?: number;
  contractPdfUrl?: string; // URL do contrato PDF customizado pelo locador
}

export interface SignedContract {
  id: string;
  rentalId: string;
  carId: string;
  renterId: string;
  ownerId: string;
  originalPdfUrl: string;
  signedPdfUrl: string;
  signatureData?: string;
  renterName: string;
  renterCpf?: string;
  renterEmail: string;
  carInfo: string;
  rentalStartDate: string;
  rentalEndDate: string;
  totalPrice: number;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'renter' | 'partner' | 'admin';
  email: string;
  // KYC Fields
  cnhUrl?: string;
  selfieUrl?: string;
  isVerified?: boolean;
  verificationDate?: string;
  // Extended Profile
  cpf?: string;
  rg?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  // Document URLs
  cpfUrl?: string; // Documento CPF/RG
  proofResidenceUrl?: string;
  // Reputation
  averageRating?: number;
}

export interface Rental {
  id: string;
  carId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  // Joined data
  car?: Car;
  renter?: User;
  // Payment
  paymentStatus?: 'pending' | 'approved' | 'rejected';
}

export interface Review {
  id: string;
  rentalId: string;
  carId?: string;
  renterId: string;
  reviewerType: 'renter_to_car' | 'owner_to_renter';
  reviewedUserId?: string; // Se for owner avaliando renter
  rating: number;
  comment: string;
  createdAt: string;
  // Joined
  reviewer?: User;
}

export interface Payment {
  id: string;
  rentalId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  paymentMethod?: string;
  externalId?: string;
  payerId: string;
  receiverId: string;
  createdAt: string;
  paidAt?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  carId: string;
}

export interface AIAnalysisResult {
  suggestedPrice: number;
  marketingDescription: string;
  features: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Partner {
  id: string;
  userId?: string;
  name: string;
  type: 'mechanic' | 'insurance';
  description: string;
  contactInfo: string;
  rating: number;
  imageUrl: string;
  benefits: string[];
  status?: 'pending' | 'active' | 'rejected';
  address?: string;
  serviceArea?: string;
  website?: string;
}

export interface ServiceRequest {
  id: string;
  ownerId: string;
  partnerId: string;
  serviceType: 'maintenance' | 'insurance_quote' | 'emergency' | 'general';
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  // Joined data
  owner?: User;
  partner?: Partner;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'rental_request' | 'rental_approved' | 'rental_rejected' | 'return_reminder' | 'new_review' | 'service_request' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalCars: number;
  activeRentals: number;
  totalRevenue: number;
  revenueByMonth: { name: string; value: number }[];
  userGrowth: { name: string; renters: number; owners: number }[];
  carStatus: { name: string; value: number }[];
}
