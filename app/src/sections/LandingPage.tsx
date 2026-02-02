import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { GraduationCap, UserCog, Shield } from 'lucide-react';

export function LandingPage() {
  const { setUserType } = useAuthStore();

  const handleStudentClick = () => {
    setUserType('student');
  };

  const handleTeacherClick = () => {
    setUserType('teacher');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">
          Prove You're Human
        </h1>
        <p className="text-slate-400 text-lg">
          Select your role to continue
        </p>
      </motion.div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Student Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button
            onClick={handleStudentClick}
            className="group relative w-full p-8 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-blue-100 mb-2">Student</h2>
              <p className="text-blue-300/70 text-sm text-center">
                Scan your ID card to verify access
              </p>
            </div>
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </motion.div>

        {/* Teacher Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={handleTeacherClick}
            className="group relative w-full p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 backdrop-blur-sm hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UserCog className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-purple-100 mb-2">Teacher</h2>
              <p className="text-purple-300/70 text-sm text-center">
                Enter PIN and scan your ID card
              </p>
            </div>
            
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </motion.div>
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-slate-500 text-sm">
          Secure RFID/NFC Authentication System
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-xs">System Online</span>
        </div>
      </motion.div>
    </div>
  );
}
