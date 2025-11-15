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
import { Pencil, Mail, Phone, Cake, MapPin, Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateAdvancedStats, calculateUserRanking, calculateProgramRanking } from '@/utils/advancedStats';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Local types (avoid external deps)
export type UserSession = { date: string; activity: string; center?: string; time?: string };
export type User = {
  id: string;
  name?: string; email?: string; phone?: string; birthday?: string;
  age?: number; center?: string; preferredPrograms?: string[];
  profileImageUrl?: string; avatar?: string; notes?: string;
  sessions?: UserSession[]; firstSession?: string; daysSinceLastSession?: number;
  totalSessions?: number;
};
interface UserDetailModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (user: User) => void;
    allUsers?: User[];
}

export const UserDetailModal = ({ user, isOpen, onClose, onEdit, allUsers = [] }: UserDetailModalProps) => {
    if (!user) return null;
    
    // ✅ Estat per al desplegable de freqüència mensual
    const [isMonthlyFrequencyOpen, setIsMonthlyFrequencyOpen] = useState(false);

    // 🆕 CÀLCUL D'ESTADÍSTIQUES
    const stats = useMemo(() => {
        const sessions = user.sessions || [];
        
        // Comptador per programa
        const programCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            programCount[session.activity] = (programCount[session.activity] || 0) + 1;
        });
        
        const programStats = Object.entries(programCount)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
        
        // Comptador per centre
        const centerCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            if (session.center) {
                centerCount[session.center] = (centerCount[session.center] || 0) + 1;
            }
        });
        
        // 🆕 SESSIONS PER ANY
        const yearlyCount: { [key: string]: number } = {};
        sessions.forEach(session => {
            const year = new Date(session.date).getFullYear().toString();
            yearlyCount[year] = (yearlyCount[year] || 0) + 1;
        });
        
        const yearlyStats = Object.entries(yearlyCount)
            .sort((a, b) => a[0].localeCompare(b[0])) // Ordenem per any
            .map(([year, count]) => ({ year, count }));
        
        // 🆕 CÀLCUL DE TENDÈNCIA
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (yearlyStats.length >= 2) {
            const lastYear = yearlyStats[yearlyStats.length - 1].count;
            const previousYear = yearlyStats[yearlyStats.length - 2].count;
            const difference = lastYear - previousYear;
            
            if (difference > 0) trend = 'up';
            else if (difference < 0) trend = 'down';
        }
        
        // Millor i pitjor any
        const bestYear = yearlyStats.length > 0 
            ? yearlyStats.reduce((max, curr) => curr.count > max.count ? curr : max)
            : null;
        const worstYear = yearlyStats.length > 0
            ? yearlyStats.reduce((min, curr) => curr.count < min.count ? curr : min)
            : null;
        
        const advancedStats = calculateAdvancedStats(user);

        // ✅ Càlcul del rànquing general
        const generalRanking = allUsers.length > 0 ? calculateUserRanking(allUsers, user, 'totalSessions') : { rank: 0, total: 0, percentile: 0 };

        const programRankings: { [key: string]: any } = {};
        programStats.forEach(prog => {
            if (allUsers.length > 0) {
                programRankings[prog.name] = calculateProgramRanking(allUsers, user, prog.name);
            }
        });

        return {
            programStats,
            centerCount,
            yearlyStats,
            trend,
            bestYear,
            worstYear,
            totalSessions: sessions.length,
            advancedStats,
            generalRanking,
            programRankings
        };
    }, [user.sessions, user.id, allUsers]);
    
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    };
    
    // AGRUPEM SESSIONS PER DATA
    const sessionsByDate = useMemo(() => {
        const sessions = user.sessions || [];
        const grouped: { [key: string]: UserSession[] } = {};
        
        sessions.forEach(session => {
            if (!grouped[session.date]) {
                grouped[session.date] = [];
            }
            grouped[session.date].push(session);
        });
        
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

                                {/* 🆕 RANKINGS GENERALS */}
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                        <Zap className="w-5 h-5 mr-2 text-primary" />
                                        La teva Posició
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-neo">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs sm:text-sm text-indigo-600 mb-1">Ranking General</div>
                                                    <div className="text-2xl sm:text-3xl font-bold text-indigo-700">
                                                        #{stats.generalRanking.rank}
                                                    </div>
                                                </div>
                                                {stats.generalRanking.total > 0 && (
                                                    <div className="text-right">
                                                        <div className="text-lg sm:text-xl font-bold text-indigo-700">
                                                            Top {stats.generalRanking.percentile}%
                                                        </div>
                                                        <div className="text-xs text-indigo-600">
                                                            de {stats.generalRanking.total} usuaris
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* 🆕 ESTADÍSTIQUES AVANÇADES */}
                                <div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                        <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                                        Anàlisi Detallada
                                    </h3>

                                    {/* ✅ Freqüència Mensual (DESPLEGABLE) */}
                                    <Collapsible 
                                        open={isMonthlyFrequencyOpen} 
                                        onOpenChange={setIsMonthlyFrequencyOpen}
                                        className="mb-4 p-3 sm:p-4 bg-muted/30 rounded-lg"
                                    >
                                        <CollapsibleTrigger className="flex items-center justify-between w-full">
                                            <h4 className="font-medium text-sm sm:text-base">Freqüència Mensual</h4>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {stats.advancedStats.monthlyFrequency.length} mesos
                                                </Badge>
                                                {isMonthlyFrequencyOpen ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </div>
                                        </CollapsibleTrigger>
                                        
                                        <CollapsibleContent className="mt-3">
                                            {stats.advancedStats.monthlyFrequency.length > 0 ? (
                                                <div className="space-y-2">
                                                    {stats.advancedStats.monthlyFrequency.map((month, idx) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <span className="text-xs sm:text-sm text-muted-foreground">{month.month}</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-16 sm:w-24 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-blue-500 transition-all"
                                                                        style={{ width: `${Math.min(month.count * 20, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <Badge variant="outline" className="text-xs">{month.count}</Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">No hi ha dades mensuals disponibles</p>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {/* Dies Entre Sessions */}
                                    <div className="mb-4 p-3 sm:p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm sm:text-base mb-2">Dies entre Sessions</h4>
                                        <div className="flex items-baseline gap-2">
                                            <div className="text-2xl sm:text-3xl font-bold text-green-600">
                                                {stats.advancedStats.daysBetweenSessions}
                                            </div>
                                            <span className="text-xs sm:text-sm text-muted-foreground">dies de mitja</span>
                                        </div>
                                    </div>

                                    {/* ✅ NOVA VISUALITZACIÓ: Autodisciplina amb cara + barra de colors */}
                                    <div className="mb-4 p-4 sm:p-5 rounded-lg shadow-neo" style={{ backgroundColor: stats.advancedStats.autodisciplineLevel.bgColor.replace('bg-', '#').replace('-50', 'f0f0f0') }}>
                                        <h4 className="font-medium text-sm sm:text-base mb-3 flex items-center gap-2">
                                            Autodisciplina
                                            <span className="text-2xl">{stats.advancedStats.autodisciplineLevel.emoji}</span>
                                        </h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Mesura la regularitat amb què assisteixes al gimnàs
                                        </p>
                                        
                                        {/* Etiqueta + Percentatge */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`font-bold text-lg ${stats.advancedStats.autodisciplineLevel.color}`}>
                                                {stats.advancedStats.autodisciplineLevel.label}
                                            </span>
                                            <span className="text-2xl font-bold">
                                                {stats.advancedStats.autodiscipline}%
                                            </span>
                                        </div>
                                        
                                        {/* Barra de progrés amb colors */}
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${stats.advancedStats.autodisciplineLevel.barColor}`}
                                                style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* ✅ Millorada Recent */}
                                    <div className="p-3 sm:p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm sm:text-base mb-3">Evolució Recent</h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Comparació del darrer mes amb la mitjana dels 3 mesos anteriors
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-2 bg-blue-50 rounded">
                                                <div className="text-lg sm:text-xl font-bold text-blue-700">{stats.advancedStats.improvementRecent.lastMonth}</div>
                                                <div className="text-xs sm:text-sm text-blue-600">Darrer mes</div>
                                            </div>
                                            <div className="text-center p-2 bg-purple-50 rounded">
                                                <div className="text-lg sm:text-xl font-bold text-purple-700">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
                                                <div className="text-xs sm:text-sm text-purple-600">Mitjana 3 mesos ant.</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs sm:text-sm text-muted-foreground">Tendència:</span>
                                                <div className="flex items-center gap-2">
                                                    {stats.advancedStats.improvementRecent.trend === 'up' && (
                                                        <Badge className="bg-green-500 text-xs">
                                                            <TrendingUp className="w-3 h-3 mr-1" />
                                                            +{stats.advancedStats.improvementRecent.percentageChange}%
                                                        </Badge>
                                                    )}
                                                    {stats.advancedStats.improvementRecent.trend === 'down' && (
                                                        <Badge className="bg-red-500 text-xs">
                                                            <TrendingDown className="w-3 h-3 mr-1" />
                                                            {stats.advancedStats.improvementRecent.percentageChange}%
                                                        </Badge>
                                                    )}
                                                    {stats.advancedStats.improvementRecent.trend === 'stable' && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <Minus className="w-3 h-3 mr-1" />
                                                            Estable
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* 🆕 RANKING PER PROGRAMA */}
                                {stats.programStats.length > 0 && (
                                    <>
                                        <div>
                                            <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center">
                                                <Award className="w-5 h-5 mr-2 text-primary" />
                                                La teva Posició per Programa
                                            </h3>
                                            <div className="space-y-2">
                                                {stats.programStats.map((prog, idx) => {
                                                    const ranking = stats.programRankings[prog.name];
                                                    return (
                                                        <div key={idx} className="p-2 sm:p-3 bg-muted/30 rounded flex items-center justify-between">
                                                            <span className="text-sm sm:text-base font-medium">{prog.name}</span>
                                                            {ranking && ranking.total > 0 ? (
                                                                <Badge className="text-xs">
                                                                    #{ranking.rank} de {ranking.total} (Top {ranking.percentile}%)
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">N/A</Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* 🆕 SESSIONS PER ANY */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-base sm:text-lg flex items-center">
                                            <Calendar className="w-5 h-5 mr-2 text-primary" />
                                            Evolució per Any
                                        </h3>
                                        {stats.trend === 'up' && (
                                            <Badge className="bg-green-500">
                                                <TrendingUp className="w-3 h-3 mr-1" />
                                                A l'alça
                                            </Badge>
                                        )}
                                        {stats.trend === 'down' && (
                                            <Badge className="bg-red-500">
                                                <TrendingDown className="w-3 h-3 mr-1" />
                                                A la baixa
                                            </Badge>
                                        )}
                                        {stats.trend === 'stable' && (
                                            <Badge variant="outline">
                                                <Minus className="w-3 h-3 mr-1" />
                                                Estable
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {stats.yearlyStats.length > 0 ? (
                                        <div className="space-y-3">
                                            {/* Millor i pitjor any */}
                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                {stats.bestYear && (
                                                    <div className="p-2 bg-green-50 border border-green-200 rounded text-center">
                                                        <div className="text-xs text-green-600 mb-1">🏆 Millor any</div>
                                                        <div className="text-lg font-bold text-green-700">{stats.bestYear.year}</div>
                                                        <div className="text-xs text-green-600">{stats.bestYear.count} sessions</div>
                                                    </div>
                                                )}
                                                {stats.worstYear && stats.yearlyStats.length > 1 && (
                                                    <div className="p-2 bg-orange-50 border border-orange-200 rounded text-center">
                                                        <div className="text-xs text-orange-600 mb-1">📉 Mínim</div>
                                                        <div className="text-lg font-bold text-orange-700">{stats.worstYear.year}</div>
                                                        <div className="text-xs text-orange-600">{stats.worstYear.count} sessions</div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Gràfic per any */}
                                            {stats.yearlyStats.map((yearData) => {
                                                const maxCount = Math.max(...stats.yearlyStats.map(y => y.count));
                                                const percentage = (yearData.count / maxCount) * 100;
                                                const isBest = stats.bestYear?.year === yearData.year;
                                                const isWorst = stats.worstYear?.year === yearData.year;
                                                
                                                return (
                                                    <div key={yearData.year} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded">
                                                        <span className={`font-medium text-sm sm:text-base min-w-[60px] ${isBest ? 'text-green-700' : isWorst ? 'text-orange-700' : ''}`}>
                                                            {yearData.year}
                                                        </span>
                                                        <div className="flex items-center gap-3 flex-1 ml-3">
                                                            <div className="h-6 sm:h-8 flex-1 bg-muted rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all ${isBest ? 'bg-green-500' : isWorst ? 'bg-orange-400' : 'bg-primary'}`}
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <Badge variant="outline" className="min-w-[50px] justify-center">
                                                                {yearData.count}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No hi ha dades d'assistència per any
                                        </p>
                                    )}
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
                                {Object.keys(stats.centerCount).length > 0 && (
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
                                )}
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
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            {session.time && (
                                                                <>
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{session.time}</span>
                                                                </>
                                                            )}
                                                            {session.center && (
                                                                <Badge variant="outline" className={`text-xs ${session.center === 'Arbúcies' ? 'bg-blue-50' : 'bg-green-50'}`}>
                                                                    {session.center}
                                                                </Badge>
                                                            )}
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
