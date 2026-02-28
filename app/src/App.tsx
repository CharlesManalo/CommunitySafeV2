import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import { LandingPage } from "./sections/LandingPage";
import { PinEntry } from "./sections/PinEntry";
import { NFCScanner } from "./sections/NFCScanner";
import { VerificationScreen } from "./sections/VerificationScreen";
import { Dashboard } from "./sections/Dashboard";
import { Toaster } from "@/components/ui/sonner";
import CardNav from "./components/CardNav";
import schoolLogo from "../public/images/omnhs-logo.png";

function App() {
  const { userType, isPinVerified, cardData, isVerified, setIsIOS } =
    useAuthStore();

  const navItems = [
    {
      label: "Navigation",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        {
          label: "Report Hazard",
          href: "/hazard",
          ariaLabel: "Report a hazard",
        },
        {
          label: "View History",
          href: "/history",
          ariaLabel: "View report history",
        },
      ],
    },
    {
      label: "Admin",
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        {
          label: "Admin Login",
          href: "/admin/login",
          ariaLabel: "Admin login",
        },
        {
          label: "RFID Dashboard",
          href: "/admin/rfid",
          ariaLabel: "RFID dashboard",
        },
      ],
    },
    {
      label: "Help",
      bgColor: "#271E37",
      textColor: "#fff",
      links: [
        { label: "How to Report", href: "#", ariaLabel: "How to report guide" },
        { label: "Contact Support", href: "#", ariaLabel: "Contact support" },
      ],
    },
  ];

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
    if (userType === "teacher" && !isPinVerified) {
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
      <CardNav
        logo={schoolLogo}
        logoAlt="OMNHS Logo"
        items={navItems}
        baseColor="#fff"
        menuColor="#000"
        buttonBgColor="#667eea"
        buttonTextColor="#fff"
      />
      <div className="pt-32">{renderScreen()}</div>
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
