
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
}

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'renter';
  email: string;
  // KYC Fields
  cnhUrl?: string;
  selfieUrl?: string;
  isVerified?: boolean;
  verificationDate?: string;
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
  name: string;
  type: 'mechanic' | 'insurance';
  description: string;
  contactInfo: string;
  rating: number;
  imageUrl: string;
  benefits: string[];
}
