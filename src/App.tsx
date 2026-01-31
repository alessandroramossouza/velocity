
import React, { useState, useEffect } from 'react';
import { getCars, createCar, updateCar, createRental, setCarAvailability, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, createNotification } from './services/api';
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
import { ConversationList } from './components/ConversationList';
import { ToastProvider, useToast, ToastStyles } from './components/Toast';
import { CarFront, UserCircle, LogOut, Shield, CheckCircle, ChevronDown, HelpCircle, CreditCard, LayoutDashboard, MessageCircle } from 'lucide-react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { supabase } from './lib/supabase';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [renterView, setRenterView] = useState<'marketplace' | 'history' | 'help' | 'payments'>('marketplace');
  const [showKYC, setShowKYC] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  // Sound Effect
  const playNotificationSound = () => {
    try {
      // MEGA ULTRA FORTE Sound - Louder and more distinct
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      // Alternative robust sound: 'https://codeskulptor-demos.commondatastorage.googleapis.com/pang/paza-moduless.mp3'
      // keeping the mixkit one but ensuring volume is max.
      audio.volume = 1.0;
      audio.play().catch(e => {
        console.log('Audio play blocked (likely requires user interaction first):', e);
        // Fallback or retry logic could go here, but usually browser blocking is strict.
      });
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  // Real-Time Notifications with Supabase Realtime
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    // Initial fetch
    const fetchNotifications = async () => {
      try {
        const data = await getNotifications(currentUser.id);
        if (!isMounted) return;
        setNotifications(data);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    };

    fetchNotifications();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Real-time notification received:', payload);

          if (payload.eventType === 'INSERT') {
            // New notification arrived
            const newNotification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              isRead: payload.new.is_read,
              link: payload.new.link,
              createdAt: payload.new.created_at
            };

            setNotifications(prev => [newNotification, ...prev]);

          } else if (payload.eventType === 'UPDATE') {
            // Notification updated (e.g., marked as read)
            setNotifications(prev =>
              prev.map(n =>
                n.id === payload.new.id
                  ? {
                    ...n,
                    isRead: payload.new.is_read,
                    title: payload.new.title,
                    message: payload.new.message
                  }
                  : n
              )
            );

          } else if (payload.eventType === 'DELETE') {
            // Notification deleted
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time notifications subscribed successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Real-time subscription timed out');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      console.log('🔌 Real-time notifications unsubscribed');
    };
  }, [currentUser]);

  // 🔥 Real-Time CARS Updates (Disponibilidade em tempo real)
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    // Subscribe to real-time changes in CARS table
    const carsChannel = supabase
      .channel('cars-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'cars'
        },
        async (payload) => {
          console.log('🚗 Real-time car update received:', payload);

          if (payload.eventType === 'INSERT') {
            // Novo carro adicionado
            const newCar = {
              id: payload.new.id,
              ownerId: payload.new.owner_id,
              make: payload.new.make,
              model: payload.new.model,
              year: payload.new.year,
              category: payload.new.category,
              pricePerDay: payload.new.price_per_day,
              pricePerWeek: payload.new.price_per_week,
              pricePerMonth: payload.new.price_per_month,
              description: payload.new.description,
              imageUrl: payload.new.image_url,
              features: payload.new.features,
              isAvailable: payload.new.is_available,
              contractPdfUrl: payload.new.contract_pdf_url,
              pricePer15Days: payload.new.price_per_15_days,
              requiresSecurityDeposit: payload.new.requires_security_deposit,
              securityDepositAmount: payload.new.security_deposit_amount
            };
            setAllCars(prev => [...prev, newCar]);

          } else if (payload.eventType === 'UPDATE') {
            // Carro atualizado (disponibilidade, preço, etc)
            const updatedCar = {
              id: payload.new.id,
              ownerId: payload.new.owner_id,
              make: payload.new.make,
              model: payload.new.model,
              year: payload.new.year,
              category: payload.new.category,
              pricePerDay: payload.new.price_per_day,
              pricePerWeek: payload.new.price_per_week,
              pricePerMonth: payload.new.price_per_month,
              description: payload.new.description,
              imageUrl: payload.new.image_url,
              features: payload.new.features,
              isAvailable: payload.new.is_available,
              contractPdfUrl: payload.new.contract_pdf_url,
              pricePer15Days: payload.new.price_per_15_days,
              requiresSecurityDeposit: payload.new.requires_security_deposit,
              securityDepositAmount: payload.new.security_deposit_amount
            };
            setAllCars(prev => prev.map(c => c.id === updatedCar.id ? updatedCar : c));

          } else if (payload.eventType === 'DELETE') {
            // Carro deletado
            setAllCars(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time cars subscribed successfully');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(carsChannel);
      console.log('🔌 Real-time cars unsubscribed');
    };
  }, [currentUser]);

  // 🔥 Real-Time RENTALS Updates (Status de aluguéis em tempo real)
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    // Subscribe to real-time changes in RENTALS table
    const rentalsChannel = supabase
      .channel('rentals-realtime-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'rentals'
        },
        async (payload) => {
          console.log('📋 Real-time rental update received:', payload);

          // Força atualização dos carros quando rental muda
          // (pode afetar disponibilidade)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Recarrega carros para sincronizar disponibilidade
            const cars = await getCars();
            if (isMounted) {
              setAllCars(cars);
            }
          }

          // Trigger para dashboards atualizarem suas listas
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time rentals subscribed successfully');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(rentalsChannel);
      console.log('🔌 Real-time rentals unsubscribed');
    };
  }, [currentUser]);

  // Refresh Trigger State (Global Data Sync)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Separate effect for sound trigger AND data refresh
  const prevNotificationsLengthRef = React.useRef(0);
  useEffect(() => {
    // Trigger if we have MORE notifications than before (new arrival) OR unread count increased
    const currentUnread = notifications.filter(n => !n.isRead).length;
    const currentTotal = notifications.length;

    // Trigger if we have MORE notifications than before (new arrival)
    // We removed 'prev > 0' check so it also triggers if you had 0 and now have 1.
    // However, on very first load/mount, prev is 0 and current might be N.
    // Ideally we want to avoid sound on initial page load.
    // But since 'fetchNotifications' runs on mount and sets state, this effect runs.

    // To solve Initial Load Sound:
    // We can use a 'isFirstLoad' ref or simply accept that if you engage refresh, it might ding.
    // Better: Only trigger if the difference is exactly 1 (realtime push) OR strictly greater.
    // The previous logic was: IF total > prev AND prev > 0.
    // The user wants sound. Let's make it robust:
    // If we receive a realtime update, 'notifications' grows by 1.

    if (currentTotal > prevNotificationsLengthRef.current) {
      // Avoid sound on initial load if we go from 0 to N immediately?
      // Actually, initial fetch usually happens fast. 
      // Let's add a small guard: Only ignore if it jumped from 0 to many (initial fetch).
      // Realtime usually adds 1 by 1.

      const isInitialFetch = (prevNotificationsLengthRef.current === 0 && currentTotal > 1);

      if (!isInitialFetch) {
        playNotificationSound();
        showToast(`Nova notificação recebida!`, 'info');
        setRefreshTrigger(prev => prev + 1); // FORCE DATA REFRESH ON DASHBOARDS
      }
    }

    prevNotificationsLengthRef.current = currentTotal;
  }, [notifications]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(currentUser.id);
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

  const handleRentCar = async (carId: string | number, startDate: string, endDate: string, totalPrice: number, paymentId?: string) => {
    if (!currentUser) return;

    try {
      const car = allCars.find(c => c.id === carId);
      if (!car) throw new Error('Carro não encontrado');

      await createRental(carId, currentUser.id, car.ownerId, startDate, endDate, totalPrice, paymentId);

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

      {/* Conversations Modal */}
      {showConversations && (
        <ConversationList
          currentUser={currentUser}
          onClose={() => setShowConversations(false)}
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
                v5.0 PRO
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

              {/* Messages Button */}
              <button
                onClick={() => setShowConversations(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition relative"
                title="Mensagens"
              >
                <MessageCircle className="w-5 h-5" />
              </button>

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
              <RenterHistory currentUser={currentUser} showToast={showToast} refreshTrigger={refreshTrigger} />
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
              refreshTrigger={refreshTrigger}
            />
          )
        }
      </main >

      {/* Footer */}
      < footer className="bg-slate-900 text-slate-400 py-8 mt-auto" >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white font-semibold">VeloCity v5.0 PRO (PAYMENTS)</p>
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
