import { User } from '@/hooks/useUsers';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, Cake, MapPin } from 'lucide-react';

// Defineix les propietats que rebrà el component
interface UserDetailModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (user: User) => void;
}

export const UserDetailModal = ({ user, isOpen, onClose, onEdit }: UserDetailModalProps) => {
    // Si no hi ha usuari o no està obert, no renderitzem res
    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] md:max-w-xl">
                <DialogHeader className="flex flex-row items-start justify-between">
                    {/* Informació bàsica */}
                    <div>
                        <DialogTitle className="text-2xl font-bold">{user.name}</DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">{user.email}</DialogDescription>
                    </div>
                    {/* Botó d'Edició */}
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-4 shadow-neo hover:shadow-neo-sm"
                        onClick={() => onEdit(user)}
                    >
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    
                    {/* Imatge i Dades Clau */}
                    <div className="flex items-center gap-4">
                        <img 
                            src={user.profileImageUrl || user.avatar} 
                            alt={user.name}
                            className="w-20 h-20 rounded-full shadow-neo object-cover flex-shrink-0"
                        />
                        <div className="space-y-1">
                            <div className="flex items-center text-sm">
                                <MapPin className="w-4 h-4 mr-2 text-primary" />
                                <span className="font-semibold">{user.center}</span>
                            </div>
                            <div className="flex items-center text-sm">
                                <Cake className="w-4 h-4 mr-2 text-primary" />
                                <span>{user.birthday} ({user.age} anys)</span>
                            </div>
                        </div>
                    </div>

                    <Separator />
                    
                    <h3 className="font-semibold text-lg">Contacte i Sessions</h3>
                    
                    {/* Detalls de Contacte i Programes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        
                        <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{user.email || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate">{user.phone || 'N/A'}</span>
                        </div>

                        {user.preferredPrograms && user.preferredPrograms.length > 0 && (
                            <div className="sm:col-span-2">
                                <p className="font-medium mb-1 text-gray-600">Sessions Habituals:</p>
                                <div className="flex flex-wrap gap-2">
                                    {user.preferredPrograms.map((program, index) => (
                                        <span key={index} className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium shadow-neo-inset">
                                            {program}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Notes */}
                    {user.notes && (
                        <>
                            <Separator />
                            <h3 className="font-semibold text-lg">Notes</h3>
                            <p className="text-sm italic text-gray-700 p-2 bg-gray-50/50 rounded-md border shadow-neo-inset whitespace-pre-wrap">
                                {user.notes}
                            </p>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
