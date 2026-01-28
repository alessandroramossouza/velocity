
import React, { useState, useEffect } from 'react';
import { getCars, createCar, updateCar, createRental, setCarAvailability } from './services/api';
import { Car, User, Notification } from './types';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PartnerDashboard } from './components/PartnerDashboard';
import { RenterMarketplace } from './components/RenterMarketplace';
import { RenterHistory } from './components/RenterHistory';
import { HelpCenter } from './components/HelpCenter';
import { NotificationBell } from './components/NotificationBell';
import { PaymentHistory } from './components/PaymentHistory';
import { Login } from './components/Login';
import { KYCVerification } from './components/KYCVerification';
import { ToastProvider, useToast, ToastStyles } from './components/Toast';
import { CarFront, UserCircle, LogOut, Shield, CheckCircle, ChevronDown, HelpCircle, CreditCard, LayoutDashboard } from 'lucide-react';
import { AdminDashboard } from './components/admin/AdminDashboard';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [renterView, setRenterView] = useState<'marketplace' | 'history' | 'help' | 'payments'>('marketplace');
  const [showKYC, setShowKYC] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      userId: '',
      type: 'general',
      title: 'Bem-vindo ao VeloCity!',
      message: 'Explore nossa plataforma e encontre o carro perfeito para você.',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ]);

  const handleMarkNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

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
    setShowProfileMenu(false);
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

      setAllCars(allCars.map(c =>
        c.id === carId ? { ...c, isAvailable: false } : c
      ));

      showToast(`Aluguel confirmado! Total: R$ ${totalPrice.toFixed(2)}`, 'success');
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

  const handleKYCComplete = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setShowKYC(false);
    showToast('Identidade verificada com sucesso!', 'success');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const myCars = allCars.filter(c => c.ownerId === currentUser.id);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* KYC Modal */}
      {showKYC && (
        <KYCVerification
          user={currentUser}
          onVerified={handleKYCComplete}
          onClose={() => setShowKYC(false)}
        />
      )}

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
                v4.0
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
                  <button
                    onClick={() => setRenterView('payments')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${renterView === 'payments' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Pagamentos
                  </button>
                  <button
                    onClick={() => setRenterView('help')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${renterView === 'help' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Notification Bell */}
              <NotificationBell
                userId={currentUser.id}
                notifications={notifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-4 border-l border-slate-200 hover:bg-slate-50 p-2 rounded-lg transition"
                >
                  <UserCircle className="w-8 h-8 text-slate-400" />
                  <div className="hidden md:block text-right">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-slate-900">{currentUser.name}</p>
                      {currentUser.isVerified && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 capitalize">
                      {currentUser.role === 'owner' ? 'Locador' : currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'partner' ? 'Parceiro' : 'Locatário'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="font-medium text-slate-900">{currentUser.name}</p>
                      <p className="text-sm text-slate-500">{currentUser.email}</p>
                    </div>

                    {/* Verification Status */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      {currentUser.isVerified ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Identidade Verificada</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowKYC(true); setShowProfileMenu(false); }}
                          className="w-full flex items-center gap-2 text-amber-600 hover:bg-amber-50 p-2 rounded-lg transition"
                        >
                          <Shield className="w-5 h-5" />
                          <div className="text-left">
                            <p className="text-sm font-medium">Verificar Identidade</p>
                            <p className="text-xs text-amber-500">Necessário para alugar</p>
                          </div>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav >

      {/* Main Content */}
      < main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" >
        {/* Helper text for context */}
        < div className="mb-8" >
          <h1 className="text-3xl font-bold text-slate-900">
            {currentUser.role === 'renter'
              ? (renterView === 'marketplace' ? 'Encontre seu próximo carro' :
                renterView === 'history' ? 'Histórico de Viagens' :
                  renterView === 'payments' ? 'Meus Pagamentos' : 'Central de Ajuda')
              : currentUser.role === 'partner'
                ? 'Portal do Parceiro'
                : currentUser.role === 'admin'
                  ? 'Visão Global'
                  : 'Painel do Locador'}
          </h1>
          <p className="text-slate-500 mt-2">
            {currentUser.role === 'renter'
              ? (renterView === 'marketplace'
                ? 'Explore nossa frota premium e reserve em segundos.'
                : renterView === 'history'
                  ? 'Acompanhe seus aluguéis ativos e consulte o histórico.'
                  : renterView === 'payments'
                    ? 'Acompanhe todas as suas transações e pagamentos.'
                    : 'Encontre respostas para suas dúvidas.')
              : currentUser.role === 'partner'
                ? 'Gerencie suas solicitações de serviço e perfil de parceiro.'
                : currentUser.role === 'admin'
                  ? 'Monitoramento em tempo real e gestão estratégica.'
                  : 'Gerencie seus veículos, acompanhe aluguéis ativos e fature mais.'}
          </p>
        </div >

        {
          currentUser.role === 'renter' ? (
            renterView === 'marketplace' ? (
              <RenterMarketplace
                cars={allCars}
                currentUser={currentUser}
                onRentCar={handleRentCar}
              />
            ) : renterView === 'history' ? (
              <RenterHistory currentUser={currentUser} showToast={showToast} />
            ) : renterView === 'payments' ? (
              <PaymentHistory userId={currentUser.id} />
            ) : (
              <HelpCenter />
            )
          ) : currentUser.role === 'partner' ? (
            <PartnerDashboard
              user={currentUser}
              showToast={showToast}
            />
          ) : currentUser.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <OwnerDashboard
              user={currentUser}
              myCars={myCars}
              onAddCar={handleAddCar}
              onUpdateCar={handleUpdateCar}
              onCarReturned={handleCarReturned}
              showToast={showToast}
            />
          )
        }
      </main >

      {/* Footer */}
      < footer className="bg-slate-900 text-slate-400 py-8 mt-auto" >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white font-semibold">VeloCity v4.0 (PAYMENTS)</p>
          <p className="text-sm mt-1">Aluguel inteligente de veículos</p>
        </div>
      </footer >
    </div >
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
