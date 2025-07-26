import { useToast } from "../../hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "./toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
            <div className="grid gap-2">
              {title && (
                <ToastTitle className="text-gray-900 font-bold text-base">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-gray-600 text-sm leading-relaxed">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="rounded-xl hover:bg-gray-100 transition-colors duration-300" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-6 sm:max-w-[420px]" />
    </ToastProvider>
  )
}
