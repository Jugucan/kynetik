import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeoCard } from '@/components/NeoCard';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

        {/* Capçalera */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-1">Kynetik</h1>
          <p className="text-lg font-semibold text-foreground mb-2">Benvingut/da! 👋</p>
          <p className="text-muted-foreground text-sm">Inicia sessió per continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="shadow-neo-inset border-0 pr-10"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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

        {/* Peu — enllaç al registre */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Encara no tens compte?{' '}
          <Link
            to="/register"
            className="text-primary font-semibold hover:underline"
          >
            Registra't aquí
          </Link>
        </div>

      </NeoCard>
    </div>
  );
};

export default Login;
