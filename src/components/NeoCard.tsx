import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NeoCardProps {
  children: ReactNode;
  className?: string;
  pressed?: boolean;
  onClick?: () => void;
}

export const NeoCard = ({ children, className, pressed = false, onClick }: NeoCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-background rounded-2xl p-6 transition-all",
        pressed ? "shadow-neo-inset" : "shadow-neo",
        onClick ? "cursor-pointer" : "",
        className
      )}
    >
      {children}
    </div>
  );
};
