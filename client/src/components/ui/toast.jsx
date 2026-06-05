import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toast — hand-rolled, dep-free.
 *
 * Why not Sonner? Sonner is great but pulls in ~30KB and an animation engine
 * we don't need. We render at most 1-2 toasts at a time (form submit, recheck
 * success/error). A 60-line context + a fixed-position stack covers every
 * AgriAlert use case.
 *
 * API:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Couldn't save", "Network down");
 *   toast.info("Refreshing forecast");
 */

const ToastContext = React.createContext(null);

let _id = 0;
const nextId = () => ++_id;

const variantClass = {
  success: "border-primary/40 bg-primary/10 text-primary",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-border bg-card text-foreground",
};

export function ToastProvider({ children, defaultDurationMs = 4000 }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = React.useCallback(
    (variant, title, description) => {
      const id = nextId();
      setToasts((t) => [...t, { id, variant, title, description }]);
      setTimeout(() => dismiss(id), defaultDurationMs);
      return id;
    },
    [defaultDurationMs, dismiss],
  );

  const value = React.useMemo(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-md border p-3 text-sm shadow-md transition-opacity",
              variantClass[t.variant] || variantClass.info,
            )}
          >
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              {t.description ? (
                <div className="mt-0.5 text-xs opacity-80">{t.description}</div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
