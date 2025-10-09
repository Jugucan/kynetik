import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeoCardProps {
  children: ReactNode;
  className?: string;
  pressed?: boolean;
}

export const NeoCard = ({ children, className, pressed = false }: NeoCardProps) => {
  return (
    <div
      className={cn(
        "bg-background rounded-2xl p-6 transition-all",
        pressed ? "shadow-neo-inset" : "shadow-neo",
        className
      )}
    >
      {children}
    </div>
  );
};
