import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Register = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!formData.firstName.trim()) return 'El nom és obligatori';
    if (!formData.lastName.trim()) return 'Els cognoms són obligatoris';
    if (!formData.email.trim()) return "L'email és obligatori";
    if (!formData.phone.trim()) return 'El telèfon és obligatori';
    if (!formData.birthDate) return 'La data de naixement és obligatòria';
    if (formData.password.length < 6) return 'La contrasenya ha de tenir mínim 6 caràcters';
    if (formData.password !== formData.confirmPassword) return 'Les contrasenyes no coincideixen';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await signup(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        birthDate: formData.birthDate,
      });
      // Un cop registrat, el portem a la pàgina d'espera
      navigate('/pending');
    } catch (err: any) {
      // Traduïm els errors més comuns de Firebase
      if (err.code === 'auth/email-already-in-use') {
        setError('Aquest email ja està registrat. Prova de fer login.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El format de l\'email no és vàlid.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contrasenya és massa feble.');
      } else {
        setError('Hi ha hagut un error en registrar-te. Torna-ho a intentar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Capçalera */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Crea el teu compte</h1>
          <p className="text-muted-foreground">
            Omple les teves dades per sol·licitar accés al gym
          </p>
        </div>

        {/* Formulari */}
        <div className="bg-card border-2 border-border shadow-neo rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nom i Cognoms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="El teu nom"
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Cognoms <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Els teus cognoms"
                  className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="el.teu@email.com"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>

            {/* Telèfon */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Telèfon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="600 000 000"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>

            {/* Data de naixement */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Data de naixement <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>

            {/* Contrasenya */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Contrasenya <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínim 6 caràcters"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>

            {/* Confirmar contrasenya */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Confirma la contrasenya <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeteix la contrasenya"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>

            {/* Missatge d'error */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Botó d'enviament */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg border-2 border-border shadow-neo hover:shadow-neo-sm hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? 'Registrant...' : 'Sol·licitar accés'}
            </button>

          </form>

          {/* Peu del formulari */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Ja tens compte?{' '}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
            >
              Inicia sessió
            </Link>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 text-center text-xs text-muted-foreground px-4">
          Un cop registrat, el gym haurà d'aprovar la teva sol·licitud abans que puguis accedir.
        </div>

      </div>
    </div>
  );
};

export default Register;
