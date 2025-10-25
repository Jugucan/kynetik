import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { programColors } from "@/lib/programColors";
import { AlertCircle, Calendar, Info } from "lucide-react";

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
  if (!date) return null;

  const activeSessions = sessions.filter(s => !s.isDeleted);
  const deletedSessions = sessions.filter(s => s.isDeleted);
  
  // 🆕 Comprovar si és un dia especial
  const isSpecialDay = holidayName || vacationReason || closureReason;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {date.toLocaleDateString("ca-ES", { 
              weekday: 'long',
              day: "numeric", 
              month: "long",
              year: "numeric"
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avisos especials */}
          {holidayName && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-700">Festiu Oficial</p>
                  <p className="text-sm text-yellow-600">{holidayName}</p>
                  <p className="text-xs text-yellow-500 mt-1">No hi ha sessions aquest dia</p>
                </div>
              </div>
            </div>
          )}

          {vacationReason && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-700">Vacances</p>
                  <p className="text-sm text-blue-600">{vacationReason}</p>
                  <p className="text-xs text-blue-500 mt-1">No hi ha sessions aquest dia</p>
                </div>
              </div>
            </div>
          )}

          {closureReason && (
            <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-700">Tancament</p>
                  <p className="text-sm text-gray-600">{closureReason}</p>
                  <p className="text-xs text-gray-500 mt-1">No hi ha sessions aquest dia</p>
                </div>
              </div>
            </div>
          )}

          {/* Sessions actives */}
          {activeSessions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Sessions programades ({activeSessions.length})
              </h3>
              <div className="space-y-2">
                {activeSessions.map((session, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-3 rounded-lg shadow-neo-inset"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg ${
                        programColors[session.program as keyof typeof programColors]?.color || 'bg-gray-500'
                      } text-white text-sm flex items-center justify-center font-bold shadow-neo`}
                    >
                      {session.program}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {programColors[session.program as keyof typeof programColors]?.name || session.program}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>🕐 {session.time}</span>
                        <span>📍 {session.center || 'N/A'}</span>
                      </div>
                    </div>
                    {session.isCustom && (
                      <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-1 rounded">
                        {session.addReason ? 'Afegida' : 'Modificada'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions eliminades */}
          {deletedSessions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Sessions cancel·lades ({deletedSessions.length})
              </h3>
              <div className="space-y-2">
                {deletedSessions.map((session, index) => (
                  <div 
                    key={index} 
                    className="p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-lg bg-gray-300 text-gray-500 text-sm flex items-center justify-center font-bold opacity-50"
                      >
                        {session.program}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium line-through text-gray-500">
                          {programColors[session.program as keyof typeof programColors]?.name || session.program}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground line-through">
                          <span>🕐 {session.time}</span>
                          <span>📍 {session.center || 'N/A'}</span>
                        </div>
                        {session.deleteReason && (
                          <div className="mt-2 p-2 rounded bg-red-500/10">
                            <p className="text-xs text-red-700">
                              <strong>Motiu:</strong> {session.deleteReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informació addicional de sessions afegides */}
          {activeSessions.some(s => s.addReason) && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-700 text-sm mb-2">Motius de sessions extra:</p>
                  <div className="space-y-1">
                    {activeSessions
                      .filter(s => s.addReason)
                      .map((session, index) => (
                        <p key={index} className="text-xs text-blue-600">
                          • {session.time} - {session.program}: {session.addReason}
                        </p>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 Si no hi ha cap sessió NI és un dia especial */}
          {activeSessions.length === 0 && deletedSessions.length === 0 && !isSpecialDay && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No hi ha sessions programades per aquest dia
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
