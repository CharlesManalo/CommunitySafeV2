import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function PinEntry() {
  const { setUserType, setTeacherPin, setPinVerified, setTeacherName } =
    useAuthStore();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleBack = () => {
    setUserType(null);
    setPin(["", "", "", ""]);
    setError("");
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow numeric input
    if (!/^\d*$/.test(value)) return;

    // Limit to single digit
    const digit = value.slice(-1);

    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError("");

    // Auto-focus next input if digit entered
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (index === 3 && digit) {
      const fullPin = [...newPin.slice(0, 3), digit].join("");
      verifyPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (!pin[index] && index > 0) {
        // Move to previous input if current is empty
        const newPin = [...pin];
        newPin[index - 1] = "";
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newPin = [...pin];
        newPin[index] = "";
        setPin(newPin);
      }
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const verifyPin = async (fullPin: string) => {
    setIsVerifying(true);

    try {
      // Call API to verify PIN
      const response = await fetch("/api/rfid/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: fullPin }),
      });

      const data = await response.json();

      if (data.valid) {
        setTeacherPin(fullPin);
        setTeacherName(data.teacher_name);
        setPinVerified(true);
        toast.success("PIN verified successfully");

        // Redirect to hazard reporting site for teachers
        setTimeout(() => {
          window.location.href = "/hazard";
        }, 1000);
      } else {
        setError("Invalid PIN. Please try again.");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
        toast.error("Invalid PIN");
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
      setPin(["", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast.error("Verification failed");
    }

    setIsVerifying(false);
  };

  const filledCount = pin.filter((d) => d !== "").length;

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
        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Enter Teacher PIN
        </h1>
        <p className="text-slate-400">Please enter your 4-digit access code</p>
      </motion.div>

      {/* PIN Input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
          {/* PIN Input Boxes */}
          <div className="flex justify-center gap-3 mb-6">
            {pin.map((digit, index) => (
              <div key={index} className="relative">
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isVerifying}
                  className={`
                    w-14 h-16 text-2xl font-bold text-center rounded-xl
                    bg-slate-900 border-2 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-purple-500/50
                    ${digit ? "border-purple-500 text-purple-300" : "border-slate-600 text-white"}
                    ${error ? "border-red-500/50" : ""}
                    ${isVerifying ? "opacity-50" : ""}
                  `}
                />
              </div>
            ))}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  w-2 h-2 rounded-full transition-all duration-300
                  ${i < filledCount ? "bg-purple-500 w-4" : "bg-slate-600"}
                `}
              />
            ))}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-red-400 text-sm justify-center mb-4"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verifying indicator */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Verifying...</span>
            </div>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Numeric keypad only • Auto-submits when complete
        </p>
      </motion.div>
    </div>
  );
}
