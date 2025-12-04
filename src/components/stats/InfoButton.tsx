import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface InfoButtonProps {
  title: string;
  description: string;
}

export const InfoButton = ({ title, description }: InfoButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ml-2 p-1 rounded-full hover:bg-primary/10 transition-colors flex-shrink-0"
        aria-label="Més informació"
      >
        <Info className="w-4 h-4 text-primary" />
      </button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={() => setIsOpen(false)}>Entesos!</Button>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
