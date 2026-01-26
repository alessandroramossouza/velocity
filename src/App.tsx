import React, { useState, useEffect } from 'react';
import { getCars, createCar } from './services/api';
import { Car, User } from './types';
import { OwnerDashboard } from './components/OwnerDashboard';
import { RenterMarketplace } from './components/RenterMarketplace';
import { Layout, CarFront, UserCircle, LogOut } from 'lucide-react';

// MOCK DATA
// MOCK DATA REMOVED


const MOCK_USER: User = {
  id: 'user1',
  name: 'João Silva',
  role: 'renter',
  email: 'joao@example.com'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [allCars, setAllCars] = useState<Car[]>([]);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    const cars = await getCars();
    setAllCars(cars);
  };

  // Switch role function to simulate the two sides of the platform
  const toggleRole = () => {
    setCurrentUser(prev => ({
      ...prev,
      role: prev.role === 'renter' ? 'owner' : 'renter'
    }));
  };

  const handleAddCar = async (newCar: Omit<Car, 'id'>) => {
    // Optimistic update or wait for ID? 
    // Since we need the ID, let's create it first.
    // However, onAddCar from OwnerDashboard passes a Car object with a generated ID probably?
    // We should treat newCar as a request payload.
    // The OwnerDashboard might need updating if it generates IDs. 
    // For now assuming we pass it to backend.
    try {
      const savedCar = await createCar(newCar);
      setAllCars([...allCars, savedCar]);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar carro");
    }
  };

  const myCars = allCars.filter(c => c.ownerId === (currentUser.role === 'owner' ? 'owner1' : currentUser.id)); // Simulating ownership

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <CarFront className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                VeloCity
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleRole}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full"
              >
                <Layout className="w-4 h-4" />
                Modo: {currentUser.role === 'renter' ? 'Locatário (Buscar)' : 'Locador (Gerenciar)'}
              </button>

              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <UserCircle className="w-8 h-8 text-slate-400" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {currentUser.role === 'renter' ? 'Encontre o carro perfeito' : 'Painel do Locador'}
          </h1>
          <p className="text-slate-500 mt-2">
            {currentUser.role === 'renter'
              ? 'Explore nossa frota ou peça ajuda ao nosso Concierge IA.'
              : 'Gerencie seus veículos, veja rendimentos e use a IA para precificar.'}
          </p>
        </div>

        {currentUser.role === 'renter' ? (
          <RenterMarketplace cars={allCars} />
        ) : (
          <OwnerDashboard user={currentUser} myCars={myCars} onAddCar={handleAddCar} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4 text-white font-semibold">VeloCity &copy; 2024</p>
          <p className="text-sm">
            A revolução do aluguel de carros P2P. Powered by Gemini AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
