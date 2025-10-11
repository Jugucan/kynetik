import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { programColors, Session } from "@/lib/programColors";

interface DayInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: Session[];
}

export const DayInfoModal = ({
  isOpen,
  onClose,
  date,
  sessions,
}: DayInfoModalProps) => {
  if (!date) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Sessions del {date.toLocaleDateString("ca-ES", { day: "numeric", month: "long" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hi ha sessions programades
            </p>
          ) : (
            sessions.map((session, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg shadow-neo-inset">
                <div
                  className={`w-10 h-10 rounded-lg ${
                    programColors[session.program].color
                  } text-white text-sm flex items-center justify-center font-bold`}
                >
                  {session.program}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{programColors[session.program].name}</p>
                  <p className="text-sm text-muted-foreground">{session.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
