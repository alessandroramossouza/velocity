
import React, { useState, useEffect } from 'react';
import { getCars, createCar, updateCar } from './services/api'; // Import updateCar
import { Car, User } from './types';
import { OwnerDashboard } from './components/OwnerDashboard';
import { RenterMarketplace } from './components/RenterMarketplace';
import { Login } from './components/Login';
import { CarFront, UserCircle, LogOut } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allCars, setAllCars] = useState<Car[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadCars();
    }
  }, [currentUser]);

  const loadCars = async () => {
    const cars = await getCars();
    setAllCars(cars);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAllCars([]);
  };

  const handleAddCar = async (newCar: Omit<Car, 'id'>) => {
    try {
      const savedCar = await createCar(newCar);
      setAllCars([...allCars, savedCar]);
      alert("Carro cadastrado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar carro");
    }
  };

  // Nova função para atualizar
  const handleUpdateCar = async (updatedCar: Car) => {
    try {
      const savedCar = await updateCar(updatedCar);
      setAllCars(allCars.map(c => c.id === savedCar.id ? savedCar : c));
      alert("Carro atualizado com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar carro");
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Filtrar carros para o dono ver apenas os dele
  const myCars = allCars.filter(c => c.ownerId === currentUser.id);

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
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <UserCircle className="w-8 h-8 text-slate-400" />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {currentUser.role === 'owner' ? 'Locador (Dono)' : 'Locatário (Cliente)'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 transition"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
          <OwnerDashboard
            user={currentUser}
            myCars={myCars}
            onAddCar={handleAddCar}
            onUpdateCar={handleUpdateCar} // Passar função
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4 text-white font-semibold">VeloCity &copy; 2024</p>
        </div>
      </footer>
    </div>
  );
}
