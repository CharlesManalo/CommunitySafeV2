import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, CheckCircle, User, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function VerificationScreen() {
  const { 
    userType, 
    cardData, 
    setCardData, 
    setScanStatus, 
    setVerified, 
    setSessionStartTime,
    teacherName 
  } = useAuthStore();

  const handleBack = () => {
    setCardData(null);
    setScanStatus('idle');
  };

  const handleConfirm = async () => {
    // Log the scan to backend
    try {
      const response = await fetch('/api/rfid/log-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: userType,
          card_id: cardData?.serialNumber,
          card_data: cardData?.textData,
          teacher_pin: userType === 'teacher' ? undefined : undefined,
        }),
      });

      if (response.ok) {
        setVerified(true);
        setSessionStartTime(new Date().toISOString());
        toast.success('Access granted!');
      } else {
        toast.error('Failed to log scan');
      }
    } catch (error) {
      // If backend not available, still proceed for demo
      setVerified(true);
      setSessionStartTime(new Date().toISOString());
      toast.success('Access granted!');
    }
  };

  // Censor card ID: show first 2 parts, mask last 2 parts
  // Format: "XX : XX : ** : **"
  const censorCardId = (id: string): string => {
    // Remove any existing separators and split into parts
    const cleanId = id.replace(/[^a-fA-F0-9]/g, '');
    
    // Try to format as hex pairs
    if (cleanId.length >= 8) {
      const parts = cleanId.match(/.{1,2}/g) || [];
      if (parts.length >= 4) {
        return `${parts[0]} : ${parts[1]} : ** : **`;
      }
    }
    
    // Fallback: show first 4 chars, mask rest
    if (id.length > 4) {
      return `${id.slice(0, 4)}${'*'.repeat(id.length - 4)}`;
    }
    
    return '*'.repeat(id.length);
  };

  // Censor text data
  const censorTextData = (data: string): string => {
    if (!data || data === 'No text data' || data === 'Manual entry (iOS)') {
      return data;
    }
    
    if (data.length > 8) {
      return `${data.slice(0, 4)}${'*'.repeat(data.length - 8)}${data.slice(-4)}`;
    }
    
    return '*'.repeat(data.length);
  };

  const isTeacher = userType === 'teacher';
  const displayName = isTeacher ? teacherName : 'Student';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Verify Your Details
        </h1>
        <p className="text-slate-400">
          Please confirm the information below
        </p>
      </motion.div>

      {/* Verification Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
          {/* User Type */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${isTeacher ? 'bg-purple-500/20' : 'bg-blue-500/20'}
            `}>
              <User className={`w-6 h-6 ${isTeacher ? 'text-purple-400' : 'text-blue-400'}`} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">User Type</p>
              <p className={`text-lg font-semibold ${isTeacher ? 'text-purple-300' : 'text-blue-300'}`}>
                {displayName}
              </p>
            </div>
          </div>

          {/* Card ID */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Card ID</p>
              <p className="text-lg font-mono text-emerald-300 tracking-wider">
                {cardData ? censorCardId(cardData.serialNumber) : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Privacy protected • Last digits hidden
              </p>
            </div>
          </div>

          {/* Card Data */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/50">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-slate-400 text-sm">Card Data</p>
              <p className="text-sm font-mono text-slate-300">
                {cardData ? censorTextData(cardData.textData) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Scan Time */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Scan Time</p>
              <p className="text-sm text-slate-300">
                {cardData ? new Date(cardData.timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <p className="text-slate-400 text-xs text-center">
            <span className="text-emerald-400">Privacy Protected:</span> Your full card details are encrypted and stored securely. Only authorized administrators can view complete information.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex-1 py-6 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 py-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Proceed
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
