
import React, { useState, useEffect } from 'react';
import { getCars, createCar, updateCar, createRental, setCarAvailability } from './services/api';
import { Car, User } from './types';
import { OwnerDashboard } from './components/OwnerDashboard';
import { RenterMarketplace } from './components/RenterMarketplace';
import { RenterHistory } from './components/RenterHistory';
import { Login } from './components/Login';
import { ToastProvider, useToast, ToastStyles } from './components/Toast';
import { CarFront, UserCircle, LogOut } from 'lucide-react';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [renterView, setRenterView] = useState<'marketplace' | 'history'>('marketplace');

  const { showToast } = useToast();

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
    showToast(`Bem-vindo(a), ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAllCars([]);
    setRenterView('marketplace');
    showToast('Você saiu do sistema.', 'info');
  };

  const handleAddCar = async (newCar: Omit<Car, 'id'>) => {
    try {
      const savedCar = await createCar(newCar);
      setAllCars([...allCars, savedCar]);
      showToast("Carro cadastrado com sucesso!", 'success');
    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar carro", 'error');
    }
  };

  const handleUpdateCar = async (updatedCar: Car) => {
    try {
      const savedCar = await updateCar(updatedCar);
      setAllCars(allCars.map(c => c.id === savedCar.id ? savedCar : c));
      showToast("Carro atualizado com sucesso!", 'success');
    } catch (e) {
      console.error(e);
      showToast("Erro ao atualizar carro", 'error');
    }
  };

  const handleRentCar = async (carId: string | number, startDate: string, endDate: string, totalPrice: number) => {
    if (!currentUser) return;

    try {
      const car = allCars.find(c => c.id === carId);
      if (!car) throw new Error('Carro não encontrado');

      await createRental(carId, currentUser.id, car.ownerId, startDate, endDate, totalPrice);

      // Atualizar lista localmente
      setAllCars(allCars.map(c =>
        c.id === carId ? { ...c, isAvailable: false } : c
      ));

      showToast(`Aluguel confirmado! Total: R$ ${totalPrice.toFixed(2)}`, 'success');

      // Opcional: Redirecionar para histórico
      // setRenterView('history'); 
    } catch (e) {
      console.error(e);
      showToast("Erro ao processar aluguel.", 'error');
    }
  };

  const handleCarReturned = (carId: string | number) => {
    setAllCars(allCars.map(c =>
      c.id === carId ? { ...c, isAvailable: true } : c
    ));
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

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
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium ml-2">
                v2.0
              </span>
            </div>

            <div className="flex items-center gap-4">
              {currentUser.role === 'renter' && (
                <div className="hidden md:flex bg-slate-100 rounded-lg p-1 mr-4">
                  <button
                    onClick={() => setRenterView('marketplace')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${renterView === 'marketplace' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Explorar
                  </button>
                  <button
                    onClick={() => setRenterView('history')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${renterView === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Meus Aluguéis
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                <UserCircle className="w-8 h-8 text-slate-400" />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {currentUser.role === 'owner' ? 'Locador' : 'Locatário'}
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
        {/* Helper text for context */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {currentUser.role === 'renter'
              ? (renterView === 'marketplace' ? 'Encontre seu próximo carro' : 'Histórico de Viagens')
              : 'Painel do Locador'}
          </h1>
          <p className="text-slate-500 mt-2">
            {currentUser.role === 'renter'
              ? (renterView === 'marketplace'
                ? 'Explore nossa frota premium e reserve em segundos.'
                : 'Acompanhe seus aluguéis ativos e consulte o histórico.')
              : 'Gerencie seus veículos, acompanhe aluguéis ativos e fature mais.'}
          </p>
        </div>

        {currentUser.role === 'renter' ? (
          renterView === 'marketplace' ? (
            <RenterMarketplace
              cars={allCars}
              currentUser={currentUser}
              onRentCar={handleRentCar}
            />
          ) : (
            <RenterHistory currentUser={currentUser} />
          )
        ) : (
          <OwnerDashboard
            user={currentUser}
            myCars={myCars}
            onAddCar={handleAddCar}
            onUpdateCar={handleUpdateCar}
            onCarReturned={handleCarReturned}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white font-semibold">VeloCity v2.0</p>
          <p className="text-sm mt-1">Aluguel inteligente de veículos</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ToastStyles />
      <AppContent />
    </ToastProvider>
  );
}
