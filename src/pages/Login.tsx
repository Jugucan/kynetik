import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeoCard } from '@/components/NeoCard';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Si us plau, omple tots els camps');
      return;
    }

    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Sessió iniciada correctament');
      navigate('/');
    } catch (error: any) {
      console.error('Error al iniciar sessió:', error);
      
      let errorMessage = 'Error al iniciar sessió';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Correu o contrasenya incorrectes';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuari no trobat';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contrasenya incorrecta';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Massa intents. Prova més tard';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <NeoCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Kynetik Gym</h1>
          <p className="text-muted-foreground">Inicia sessió per continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Correu electrònic</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              className="shadow-neo-inset border-0"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasenya</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="shadow-neo-inset border-0"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full shadow-neo hover:shadow-neo-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciant sessió...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar sessió
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Si no tens compte, contacta amb l'administrador</p>
        </div>
      </NeoCard>
    </div>
  );
};

export default Login;
