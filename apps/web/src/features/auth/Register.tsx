import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../config/api';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; acceptTerms?: string; form?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!acceptTerms) {
      newErrors.acceptTerms = 'You must agree to the terms and privacy policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { user, accessToken, refreshToken } = response.data.data;
      
      setAuth(user, accessToken, refreshToken);
      addToast(`Account created! Welcome, ${user.username}`, 'success');

      const pendingInviteToken = localStorage.getItem('pending_invite_token');
      if (pendingInviteToken) {
        localStorage.removeItem('pending_invite_token');
        try {
          const acceptRes = await api.post(`/invites/token/${pendingInviteToken}/accept`);
          const groupJoined = acceptRes.data.data.invite.group;
          addToast('Joined group successfully via invite!', 'success');
          navigate(`/groups/${groupJoined}`);
          return;
        } catch (inviteErr) {
          console.error('Failed to auto-accept invite:', inviteErr);
        }
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Something went wrong. Please try again.';
      setErrors({ form: errorMessage });
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Split expenses with your friends seamlessly
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 sm:p-8 relative overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {errors.form && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-semibold">
              {errors.form}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Username
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-all">
                <User size={16} />
              </span>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none ${
                  errors.username ? 'border-destructive focus:ring-destructive' : ''
                }`}
              />
            </div>
            {errors.username && (
              <span className="text-xs text-destructive font-medium mt-0.5">{errors.username}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Email Address
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-all">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none ${
                  errors.email ? 'border-destructive focus:ring-destructive' : ''
                }`}
              />
            </div>
            {errors.email && (
              <span className="text-xs text-destructive font-medium mt-0.5">{errors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Password
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground/60 group-focus-within:text-primary transition-all">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none ${
                  errors.password ? 'border-destructive focus:ring-destructive' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password ? (
              <span className="text-xs text-destructive font-medium mt-0.5">{errors.password}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground/80 font-medium tracking-wide">Must be at least 8 characters</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2.5 mt-1">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary transition-all cursor-pointer accent-primary"
              />
              <label htmlFor="acceptTerms" className="text-xs text-muted-foreground select-none leading-normal cursor-pointer">
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline transition-all">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline transition-all">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <span className="text-xs text-destructive font-medium mt-0.5 pl-[26px]">{errors.acceptTerms}</span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
            isLoading={isLoading}
          >
            {!isLoading && <span>Sign Up</span>}
            {!isLoading && <ArrowRight size={16} />}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-primary hover:underline transition-all decoration-2"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
};

export default Register;
