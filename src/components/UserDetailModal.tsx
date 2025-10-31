import { User, UserSession } from '@/hooks/useUsers';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, Cake, MapPin, Calendar, TrendingUp, Award, Clock, Info } from 'lucide-react';
import { useMemo } from 'react';

interface UserDetailModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (user: User) => void;
}

export const UserDetailModal = ({ user, isOpen, onClose, onEdit }: UserDetailModalProps) => {
    if (!user) return null;

    // 🆕 CÀLCUL D'ESTADÍSTIQUES
    const stats = useMemo(() => {
        const sessions = user.sessions || [];
        
        // Comptador per programa
        const programCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            programCount[session.activity] = (programCount[session.activity] || 0) + 1;
        });
        
        // Ordenem per quantitat
        const programStats = Object.entries(programCount)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
        
        // Comptador per centre
        const centerCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            centerCount[session.center] = (centerCount[session.center] || 0) + 1;
        });
        
        // Sessions per mes (últims 12 mesos)
        const now = new Date();
        const monthlyCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
            monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
        });
        
        return {
            programStats,
            centerCount,
            monthlyCount,
            totalSessions: sessions.length
        };
    }, [user.sessions]);
    
    // 🆕 FORMATEM LA DATA
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    
    // 🆕 AGRUPEM SESSIONS PER DATA
    const sessionsByDate = useMemo(() => {
        const sessions = user.sessions || [];
        const grouped: { [key: string]: UserSession[] } = {};
        
        sessions.forEach(session => {
            if (!grouped[session.date]) {
                grouped[session.date] = [];
            }
            grouped[session.date].push(session);
        });
        
        // Ordenem per data (més recent primer)
        return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
    }, [user.sessions]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[90vh] p-0">
                {/* CAPÇALERA FIXA */}
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <img 
                                src={user.profileImageUrl || user.avatar} 
                                alt={user.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-neo object-cover flex-shrink-0"
                            />
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-bold">{user.name}</DialogTitle>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge variant="outline" className={user.center === "Arbúcies" ? "bg-blue-100" : "bg-green-100"}>
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {user.center}
                                    </Badge>
                                    <Badge variant="outline">
                                        <Cake className="w-3 h-3 mr-1" />
                                        {user.age} anys
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="shadow-neo hover:shadow-neo-sm self-start"
                            onClick={() => onEdit(user)}
                        >
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                        </Button>
                    </div>
                </DialogHeader>

                {/* PESTANYES */}
                <Tabs defaultValue="info" className="px-4 sm:px-6">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="info" className="text-xs sm:text-sm">
                            <Info className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Informació</span>
                            <span className="sm:hidden">Info</span>
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="text-xs sm:text-sm">
                            <TrendingUp className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Estadístiques</span>
                            <span className="sm:hidden">Stats</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-xs sm:text-sm">
                            <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Historial</span>
                            <span className="sm:hidden">Hist.</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* PESTANYA 1: INFORMACIÓ GENERAL */}
                    <TabsContent value="info" className="space-y-4 pb-6">
                        <ScrollArea className="h-[50vh] sm:h-[60vh] pr-4">
                            <div className="space-y-4">
                                {/* Contacte */}
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                        <Mail className="w-5 h-5 mr-2 text-primary" />
                                        Contacte
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                                            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate">{user.email || 'No disponible'}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span>{user.phone || 'No disponible'}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded">
                                            <Cake className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span>{user.birthday}</span>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Sessions Habituals */}
                                {user.preferredPrograms && user.preferredPrograms.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                            <Award className="w-5 h-5 mr-2 text-primary" />
                                            Sessions Habituals
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {user.preferredPrograms.map((program, index) => (
                                                <Badge key={index} variant="secondary" className="px-3 py-1">
                                                    {program}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {user.notes && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h3 className="font-semibold text-base sm:text-lg mb-3">Notes</h3>
                                            <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded whitespace-pre-wrap">
                                                {user.notes}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* PESTANYA 2: ESTADÍSTIQUES */}
                    <TabsContent value="stats" className="space-y-4 pb-6">
                        <ScrollArea className="h-[50vh] sm:h-[60vh] pr-4">
                            <div className="space-y-6">
                                {/* Resum General */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-neo text-center">
                                        <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalSessions}</div>
                                        <div className="text-xs sm:text-sm text-blue-600 mt-1">Sessions Totals</div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-neo text-center">
                                        <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.programStats.length}</div>
                                        <div className="text-xs sm:text-sm text-green-600 mt-1">Programes</div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-neo text-center">
                                        <div className="text-2xl sm:text-3xl font-bold text-purple-700">{user.daysSinceLastSession || 0}</div>
                                        <div className="text-xs sm:text-sm text-purple-600 mt-1">Dies sense venir</div>
                                    </div>
                                    <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-neo text-center">
                                        <div className="text-xl sm:text-2xl font-bold text-orange-700">
                                            {user.firstSession ? new Date(user.firstSession).getFullYear() : 'N/A'}
                                        </div>
                                        <div className="text-xs sm:text-sm text-orange-600 mt-1">Des de</div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Sessions per Programa */}
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                        <Award className="w-5 h-5 mr-2 text-primary" />
                                        Sessions per Programa
                                    </h3>
                                    <div className="space-y-2">
                                        {stats.programStats.map((prog, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded">
                                                <span className="font-medium text-sm sm:text-base">{prog.name}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-20 sm:w-32 bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${(prog.count / stats.totalSessions) * 100}%` }}
                                                        />
                                                    </div>
                                                    <Badge variant="outline">{prog.count}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Sessions per Centre */}
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                        <MapPin className="w-5 h-5 mr-2 text-primary" />
                                        Sessions per Centre
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {Object.entries(stats.centerCount).map(([center, count]) => (
                                            <div key={center} className="p-3 sm:p-4 bg-muted/30 rounded text-center">
                                                <div className="text-xl sm:text-2xl font-bold">{count}</div>
                                                <div className="text-xs sm:text-sm text-muted-foreground">{center}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* PESTANYA 3: HISTORIAL */}
                    <TabsContent value="history" className="pb-6">
                        <ScrollArea className="h-[50vh] sm:h-[60vh] pr-4">
                            {sessionsByDate.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No hi ha historial de sessions disponible
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sessionsByDate.map(([date, sessions]) => (
                                        <div key={date} className="border rounded-lg p-3 sm:p-4 bg-muted/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                <h4 className="font-semibold text-sm sm:text-base">{formatDate(date)}</h4>
                                                <Badge variant="outline" className="ml-auto">{sessions.length} sessions</Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {sessions.map((session, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-background rounded text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="text-xs">{session.activity}</Badge>
                                                            <span className="text-xs text-muted-foreground">{session.sala}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{session.time}</span>
                                                            <Badge variant="outline" className={`text-xs ${session.center === 'Arbúcies' ? 'bg-blue-50' : 'bg-green-50'}`}>
                                                                {session.center}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
