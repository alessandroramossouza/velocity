
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
  averageRating?: number; // Média de avaliações
}

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'renter';
  email: string;
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
  renter?: User; // Dados do locatário
}

export interface Review {
  id: string;
  rentalId: string;
  carId: string;
  renterId: string;
  rating: number;
  comment: string;
  createdAt: string;
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
