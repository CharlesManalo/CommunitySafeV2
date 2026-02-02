import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LandingPage } from './sections/LandingPage';
import { PinEntry } from './sections/PinEntry';
import { NFCScanner } from './sections/NFCScanner';
import { VerificationScreen } from './sections/VerificationScreen';
import { Dashboard } from './sections/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { 
    userType, 
    isPinVerified, 
    cardData, 
    isVerified, 
    setIsIOS 
  } = useAuthStore();

  // Detect iOS on mount
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
  }, [setIsIOS]);

  // Determine which screen to show
  const renderScreen = () => {
    // No user type selected - show landing
    if (!userType) {
      return <LandingPage />;
    }

    // Teacher selected but PIN not verified - show PIN entry
    if (userType === 'teacher' && !isPinVerified) {
      return <PinEntry />;
    }

    // User type selected (student or verified teacher) but no card data - show scanner
    if (!cardData) {
      return <NFCScanner />;
    }

    // Card data present but not verified - show verification
    if (cardData && !isVerified) {
      return <VerificationScreen />;
    }

    // Everything verified - show dashboard
    if (isVerified) {
      return <Dashboard />;
    }

    // Fallback to landing
    return <LandingPage />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {renderScreen()}
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
