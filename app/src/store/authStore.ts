import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserType = 'student' | 'teacher' | null;
export type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export interface CardData {
  serialNumber: string;
  textData: string;
  timestamp: string;
}

export interface AuthState {
  // User selection
  userType: UserType;
  setUserType: (type: UserType) => void;
  
  // PIN verification
  teacherPin: string;
  setTeacherPin: (pin: string) => void;
  isPinVerified: boolean;
  setPinVerified: (verified: boolean) => void;
  teacherName: string | null;
  setTeacherName: (name: string | null) => void;
  
  // NFC Scanning
  scanStatus: ScanStatus;
  setScanStatus: (status: ScanStatus) => void;
  cardData: CardData | null;
  setCardData: (data: CardData | null) => void;
  
  // Verification
  isVerified: boolean;
  setVerified: (verified: boolean) => void;
  
  // Session
  sessionStartTime: string | null;
  setSessionStartTime: (time: string | null) => void;
  
  // iOS detection
  isIOS: boolean;
  setIsIOS: (isIOS: boolean) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  userType: null as UserType,
  teacherPin: '',
  isPinVerified: false,
  teacherName: null as string | null,
  scanStatus: 'idle' as ScanStatus,
  cardData: null as CardData | null,
  isVerified: false,
  sessionStartTime: null as string | null,
  isIOS: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUserType: (type) => set({ userType: type }),
      setTeacherPin: (pin) => set({ teacherPin: pin }),
      setPinVerified: (verified) => set({ isPinVerified: verified }),
      setTeacherName: (name) => set({ teacherName: name }),
      setScanStatus: (status) => set({ scanStatus: status }),
      setCardData: (data) => set({ cardData: data }),
      setVerified: (verified) => set({ isVerified: verified }),
      setSessionStartTime: (time) => set({ sessionStartTime: time }),
      setIsIOS: (isIOS) => set({ isIOS }),
      
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'rfid-auth-storage',
      partialize: (state) => ({
        userType: state.userType,
        teacherPin: state.teacherPin,
        isPinVerified: state.isPinVerified,
        teacherName: state.teacherName,
        cardData: state.cardData,
        isVerified: state.isVerified,
        sessionStartTime: state.sessionStartTime,
      }),
    }
  )
);
