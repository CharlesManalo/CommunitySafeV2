import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { LogOut, User, CreditCard, Clock, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Dashboard() {
  const { 
    userType, 
    cardData, 
    sessionStartTime, 
    teacherName, 
    reset 
  } = useAuthStore();

  const handleLogout = () => {
    reset();
    toast.info('Logged out successfully');
  };

  // Censor card ID (same logic as verification)
  const censorCardId = (id: string): string => {
    const cleanId = id.replace(/[^a-fA-F0-9]/g, '');
    
    if (cleanId.length >= 8) {
      const parts = cleanId.match(/.{1,2}/g) || [];
      if (parts.length >= 4) {
        return `${parts[0]} : ${parts[1]} : ** : **`;
      }
    }
    
    if (id.length > 4) {
      return `${id.slice(0, 4)}${'*'.repeat(id.length - 4)}`;
    }
    
    return '*'.repeat(id.length);
  };

  const isTeacher = userType === 'teacher';
  const displayName = isTeacher ? teacherName : 'Student';

  // Format session duration
  const getSessionDuration = () => {
    if (!sessionStartTime) return 'Just started';
    
    const start = new Date(sessionStartTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="text-center mb-10"
      >
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </motion.div>
          
          {/* Success ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-emerald-500/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl font-bold text-white mb-2"
        >
          Welcome!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-emerald-400"
        >
          Access Granted
        </motion.p>
      </motion.div>

      {/* Session Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Session Details</h2>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${isTeacher ? 'bg-purple-500/20' : 'bg-blue-500/20'}
              `}>
                <User className={`w-5 h-5 ${isTeacher ? 'text-purple-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">User</p>
                <p className={`font-medium ${isTeacher ? 'text-purple-300' : 'text-blue-300'}`}>
                  {displayName}
                </p>
              </div>
            </div>

            {/* Card Info */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Card ID</p>
                <p className="font-mono text-emerald-300 tracking-wider">
                  {cardData ? censorCardId(cardData.serialNumber) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Session Time */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Session Duration</p>
                <p className="text-slate-200 font-medium">
                  {getSessionDuration()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-emerald-300 text-sm font-medium mb-1">
                Secure Session Active
              </p>
              <p className="text-emerald-400/70 text-xs">
                Your identity has been verified. This session is logged for security purposes.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full py-6 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-slate-500 text-xs text-center"
      >
        RFID Access Control System • Secure Authentication
      </motion.p>
    </div>
  );
}
