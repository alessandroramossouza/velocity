
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
import { ToastProvider, useToast, ToastStyles } from './components/Toast';
import { CarFront, UserCircle, LogOut, Shield, CheckCircle, ChevronDown, HelpCircle, CreditCard, LayoutDashboard } from 'lucide-react';
import { AdminDashboard } from './components/admin/AdminDashboard';

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [renterView, setRenterView] = useState<'marketplace' | 'history' | 'help' | 'payments'>('marketplace');
  const [showKYC, setShowKYC] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  // Notification Polling
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    let prevUnreadCount = 0;

    const fetchNotifications = async () => {
      try {
        const data = await getNotifications(currentUser.id);
        if (!isMounted) return;

        setNotifications(prev => {
          // Compare previous unread count to current to trigger sound
          // We use the functional update to access the *current* state at this moment, 
          // but efficiently we might just compare with data directly if we tracked it differently.
          // However, to detect *changes*, we need to know what we had before.
          // Since we can't easily access 'prev' outside, we'll relay on a simple comparison 
          // of the fetch result vs the known state variable if we tracked it in a ref?
          // Easier approach: Just set it. But to play sound, we need to know if it increased.

          // Let's use a trusted heuristic: calculate unread from 'data'.
          const currentUnread = data.filter(n => !n.isRead).length;

          // We need to compare with the previous fetch.
          // But 'prevUnreadCount' local var persists in the closure of the effect? No.
          // We need a ref for previous count.
          return data;
        });

      } catch (e) {
        console.error('Poll error', e);
      }
    };

    fetchNotifications(); // Initial

    const interval = setInterval(fetchNotifications, 2000); // Poll every 2s for Real-Time feel
    return () => {
      isMounted = false;
      clearInterval(interval);
    }
  }, [currentUser]);

  // Refresh Trigger State (Global Data Sync)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Separate effect for sound trigger AND data refresh
  const prevNotificationsLengthRef = React.useRef(0);
  useEffect(() => {
    // Trigger if we have MORE notifications than before (new arrival) OR unread count increased
    const currentUnread = notifications.filter(n => !n.isRead).length;
    const currentTotal = notifications.length;

    if (currentTotal > prevNotificationsLengthRef.current && prevNotificationsLengthRef.current > 0) {
      // New notification arrived!
      playNotificationSound();
      showToast(`Nova notificação recebida!`, 'info');
      setRefreshTrigger(prev => prev + 1); // FORCE DATA REFRESH ON DASHBOARDS
    }

    prevNotificationsLengthRef.current = currentTotal;
  }, [notifications]);

  // ... (rest of methods)

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

  export default function App() {
    return (
      <ToastProvider>
        <ToastStyles />
        <AppContent />
      </ToastProvider>
    );
  }
