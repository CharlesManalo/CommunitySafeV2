import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Web NFC API Types
interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: DataView;
  encoding?: string;
  lang?: string;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFReaderClass {
  new (): {
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((event: Event) => void) | null;
    scan(options?: { signal?: AbortSignal }): Promise<void>;
  };
}

declare global {
  interface Window {
    NDEFReader?: NDEFReaderClass;
  }
}

export function NFCScanner() {
  const {
    userType,
    setUserType,
    setScanStatus,
    scanStatus,
    setCardData,
    setIsIOS,
  } = useAuthStore();

  const [error, setError] = useState("");

  // Check for iOS and NFC support
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if Web NFC is supported
    const hasNFC = "NDEFReader" in window;

    if (isIOSDevice || !hasNFC) {
      setError("NFC not supported on this device");
    }
  }, [setIsIOS]);

  const handleBack = () => {
    setUserType(null);
    setScanStatus("idle");
    setCardData(null);
  };

  const startScan = async () => {
    setError("");
    setScanStatus("scanning");

    try {
      const NDEFReader = window.NDEFReader;
      if (!NDEFReader) {
        throw new Error("NFC not supported on this device");
      }

      const ndef = new NDEFReader();
      const controller = new AbortController();

      ndef.onreading = (event: NDEFReadingEvent) => {
        const serialNumber = event.serialNumber || "unknown";

        // Extract text data from records
        let textData = "";
        if (event.message && event.message.records) {
          for (const record of event.message.records) {
            if (record.recordType === "text" && record.data) {
              const decoder = new TextDecoder(record.encoding || "utf-8");
              textData = decoder.decode(record.data);
              break;
            }
          }
        }

        // Stop scanning
        controller.abort();

        // Set card data
        setCardData({
          serialNumber,
          textData: textData || "No text data",
          timestamp: new Date().toISOString(),
        });

        setScanStatus("success");
        toast.success("Card scanned successfully");
      };

      ndef.onreadingerror = () => {
        setScanStatus("error");
        setError("Failed to read card. Please try again.");
        toast.error("Card read failed");
      };

      await ndef.scan({ signal: controller.signal });
    } catch (err: unknown) {
      console.error("NFC Error:", err);
      setScanStatus("error");
      const errorMessage =
        err instanceof Error ? err.message : "NFC scan failed";
      setError(errorMessage);
      toast.error("NFC scan failed");
    }
  };

  const getStatusColor = () => {
    switch (scanStatus) {
      case "idle":
        return "border-slate-600";
      case "scanning":
        return "border-blue-500";
      case "success":
        return "border-emerald-500";
      case "error":
        return "border-red-500";
      default:
        return "border-slate-600";
    }
  };

  const getStatusBg = () => {
    switch (scanStatus) {
      case "idle":
        return "bg-slate-800/30";
      case "scanning":
        return "bg-blue-500/10";
      case "success":
        return "bg-emerald-500/10";
      case "error":
        return "bg-red-500/10";
      default:
        return "bg-slate-800/30";
    }
  };

  const isTeacher = userType === "teacher";

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
        <h1 className="text-3xl font-bold text-white mb-2">
          Scan Your ID Card
        </h1>
        <p className="text-slate-400">
          {isTeacher ? "Teacher Access" : "Student Access"}
        </p>
      </motion.div>

      {/* Scan Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative"
      >
        {/* Main Scan Circle */}
        <div
          className={`
            relative w-64 h-64 rounded-full border-4 ${getStatusColor()}
            ${getStatusBg()} backdrop-blur-sm
            flex items-center justify-center
            transition-all duration-500
          `}
        >
          {/* Ripple Animation when scanning */}
          {scanStatus === "scanning" && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-blue-400/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-blue-400/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}

          {/* Center Icon */}
          <div className="text-center">
            {scanStatus === "idle" && (
              <Smartphone className="w-16 h-16 text-slate-400 mx-auto" />
            )}
            {scanStatus === "scanning" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-16 h-16 text-blue-400 mx-auto" />
              </motion.div>
            )}
            {scanStatus === "success" && (
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            )}
            {scanStatus === "error" && (
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
            )}

            <p
              className={`
              mt-4 font-medium
              ${scanStatus === "idle" ? "text-slate-400" : ""}
              ${scanStatus === "scanning" ? "text-blue-400" : ""}
              ${scanStatus === "success" ? "text-emerald-400" : ""}
              ${scanStatus === "error" ? "text-red-400" : ""}
            `}
            >
              {scanStatus === "idle" && "Ready to scan"}
              {scanStatus === "scanning" && "Scanning..."}
              {scanStatus === "success" && "Card detected!"}
              {scanStatus === "error" && "Scan failed"}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex justify-center mt-6 gap-2">
          <div
            className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${scanStatus === "idle" ? "bg-slate-500" : "bg-slate-700"}
          `}
          />
          <div
            className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${scanStatus === "scanning" ? "bg-blue-500 animate-pulse" : "bg-slate-700"}
          `}
          />
          <div
            className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${scanStatus === "success" ? "bg-emerald-500" : "bg-slate-700"}
          `}
          />
          <div
            className={`
            w-3 h-3 rounded-full transition-colors duration-300
            ${scanStatus === "error" ? "bg-red-500" : "bg-slate-700"}
          `}
          />
        </div>
      </motion.div>

      {/* Scan Button */}
      {scanStatus === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10"
        >
          <Button
            onClick={startScan}
            size="lg"
            className={`
              px-8 py-6 text-lg font-semibold rounded-xl
              ${
                isTeacher
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
            `}
          >
            Start Scanning
          </Button>
        </motion.div>
      )}

      {/* Retry Button */}
      {(scanStatus === "error" || scanStatus === "success") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <Button
            onClick={() => {
              setScanStatus("idle");
              setError("");
            }}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Scan Again
          </Button>
        </motion.div>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-slate-500 text-sm text-center max-w-md"
      >
        Hold your ID card near the back of your device. Make sure NFC is enabled
        in your device settings.
      </motion.p>
    </div>
  );
}
