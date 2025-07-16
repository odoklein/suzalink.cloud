// components/ui/use-toast.ts
import { useContext } from "react";
import { ToastContext } from "./toast-context"; // Replace with your actual context path

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
