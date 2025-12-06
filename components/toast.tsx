// components/toast.tsx

"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-xl border px-5 py-4 shadow-2xl glass-effect animate-slide-up ${
        type === "success"
          ? "border-green-500/30 bg-green-500/10 text-green-300 backdrop-blur-xl"
          : "border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-xl font-bold ${type === "success" ? "text-green-400" : "text-red-400"}`}>
          {type === "success" ? "✓" : "✕"}
        </span>
        <span className="text-sm font-medium font-display">{message}</span>
      </div>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  ) : null;

  return { showToast, ToastComponent };
}

