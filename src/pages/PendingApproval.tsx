import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const { userStatus, logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Donem un petit marge perquè el perfil es carregui
    const timer = setTimeout(() => {
      setChecking(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!checking && userStatus === 'approved') {
      window.location.href = '/';
    }
  }, [checking, userStatus]);

  // També escoltem canvis en temps real
  useEffect(() => {
    if (userStatus === 'approved') {
      window.location.href = '/';
    }
  }, [userStatus]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const isRejected = userStatus === 'rejected';

  if (userStatus === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Redirigint...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-border shadow-neo mb-4"
            style={{ backgroundColor: isRejected ? '#fef2f2' : '#fefce8' }}>
            <span className="text-4xl">
              {isRejected ? '✋' : '⏳'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isRejected ? 'Sol·licitud no aprovada' : 'Sol·licitud enviada!'}
          </h1>
          <p className="text-muted-foreground">
            {isRejected
              ? 'La teva sol·licitud d\'accés no ha estat aprovada.'
              : 'La teva sol·licitud està pendent d\'aprovació.'}
          </p>
        </div>

        <div className="bg-card border-2 border-border shadow-neo rounded-xl p-8 text-center space-y-4">
          {isRejected ? (
            <>
              <p className="text-foreground">
                Hola <strong>{userProfile?.firstName || userProfile?.displayName}</strong>,
                lamentablement la teva sol·licitud no ha estat aprovada.
              </p>
              <p className="text-muted-foreground text-sm">
                Si creus que és un error, posa't en contacte directament amb el teu gym.
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground">
                Hola <strong>{userProfile?.firstName || userProfile?.displayName}</strong>! 👋
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Hem rebut la teva sol·licitud correctament. El gym la revisarà
                i et notificarem quan estigui aprovada.
              </p>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm">
                Mentre esperes, no pots accedir a l'aplicació. Gràcies per la paciència!
              </div>
            </>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-background text-foreground font-semibold rounded-lg border-2 border-border shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all mt-4"
          >
            Tancar sessió
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Si tens dubtes, contacta amb el teu gym directament.
        </div>

      </div>
    </div>
  );
};

export default PendingApproval;
