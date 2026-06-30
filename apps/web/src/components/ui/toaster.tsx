import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastContextValue = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  error: "border-red-500/30 bg-red-500/10 text-red-700",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700",
};

const KIND_ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = crypto.randomUUID();
    setItems((previous) => [...previous.slice(-3), { id, kind, title, description }]);
    window.setTimeout(() => {
      setItems((previous) => previous.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2 ${KIND_STYLES[item.kind]}`}
          >
            <div className="mt-0.5 shrink-0">{KIND_ICONS[item.kind]}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium">{item.title}</div>
              {item.description && (
                <div className="mt-0.5 text-xs opacity-85">{item.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
