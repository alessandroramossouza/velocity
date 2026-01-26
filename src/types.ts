export interface Car {
  id: string | number;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  category: 'SUV' | 'Sedan' | 'Hatchback' | 'Luxury' | 'Sports';
  pricePerDay: number;
  description: string;
  imageUrl: string;
  features: string[];
  isAvailable: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'renter'; // Simplified for this demo, real app users might be both
  email: string;
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
