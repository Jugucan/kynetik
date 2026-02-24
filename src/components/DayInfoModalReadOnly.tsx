import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { useProgramColors } from "@/hooks/useProgramColors";

interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
}

interface DayInfoModalReadOnlyProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: Session[];
  holidayName?: string;
  vacationReason?: string;
  closureReason?: string;
}

export const DayInfoModalReadOnly = ({
  isOpen,
  onClose,
  date,
  sessions,
  holidayName,
  vacationReason,
  closureReason,
}: DayInfoModalReadOnlyProps) => {
  const { getProgramColor, getProgramName } = useProgramColors();

  if (!date) return null;

  const formattedDate = date.toLocaleDateString("ca-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const activeSessions = sessions.filter((s) => !s.isDeleted);
  const cancelledSessions = sessions.filter((s) => s.isDeleted);

  const isSpecialDay = holidayName || vacationReason || closureReason;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            <Calendar className="w-5 h-5 text-primary" />
            {formattedDate}
          </DialogTitle>
        </DialogHeader>

        {/* Alertes de dies especials */}
        {isSpecialDay && (
          <div className="space-y-2">
            {holidayName && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-700">Festiu oficial</p>
                  <p className="text-sm text-yellow-600">{holidayName}</p>
                </div>
              </div>
            )}

            {vacationReason && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-700">Vacances</p>
                  {/* ✅ NO mostrem el motiu de les vacances als usuaris */}
                </div>
              </div>
            )}

            {closureReason && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-500/10 border border-gray-500/30">
                <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-700">Tancament</p>
                  {/* ✅ NO mostrem el motiu del tancament als usuaris */}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessions actives */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sessions programades ({activeSessions.length})
          </h3>

          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 italic">
              No hi ha sessions programades aquest dia
            </p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((session, index) => {
                const programColor = getProgramColor(session.program);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg shadow-neo-inset"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-neo"
                      style={{ backgroundColor: programColor }}
                    >
                      {session.program}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{getProgramName(session.program)}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.time}
                        </span>
                        {session.center && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.center}
                          </span>
                        )}
                      </div>
                      {session.isCustom && session.addReason && (
                        <p className="text-xs text-primary mt-1">
                          Sessió afegida
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sessions cancel·lades — SÍ es mostren, però SENSE motiu */}
        {cancelledSessions.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-gray-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Sessions cancel·lades ({cancelledSessions.length})
            </h3>

            <div className="space-y-2">
              {cancelledSessions.map((session, index) => {
                const programColor = getProgramColor(session.program);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg shadow-neo-inset opacity-50"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-neo grayscale"
                      style={{ backgroundColor: programColor }}
                    >
                      {session.program}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold line-through text-muted-foreground">
                        {getProgramName(session.program)}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {session.time}
                        </span>
                        {session.center && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {session.center}
                          </span>
                        )}
                      </div>
                      {/* ✅ NO mostrem session.deleteReason als usuaris */}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg shadow-neo hover:shadow-neo-sm transition-all font-medium"
          >
            Tancar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
