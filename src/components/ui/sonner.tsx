"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-[3px] group-[.toaster]:border-black group-[.toaster]:shadow-[8px_8px_0px_0px_#000] group-[.toaster]:rounded-[24px] group-[.toaster]:font-bold",
          description: "group-[.toast]:text-gray-500 group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-white group-[.toast]:border-2 group-[.toast]:border-black group-[.toast]:shadow-[3px_3px_0px_0px_#000] group-[.toast]:rounded-full group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:font-black",
          cancelButton:
            "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:border-2 group-[.toast]:border-black group-[.toast]:shadow-[3px_3px_0px_0px_#000] group-[.toast]:rounded-full group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:font-black",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
