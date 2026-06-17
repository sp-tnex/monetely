import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { api } from '../../config/api';
import { Button } from '../../components/ui/Button';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
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
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data.data;
      
      setAuth(user, accessToken);
      addToast(`Welcome back, ${user.username}!`, 'success');

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
      const errorMessage = err.response?.data?.message || 'Invalid email or password';
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
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details below to log in to your account
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
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Password
              </label>
              <button
                type="button"
                onClick={() => addToast('Please contact support to reset your password.', 'info')}
                className="text-[10px] font-bold text-primary hover:underline transition-all uppercase tracking-wider"
              >
                Forgot?
              </button>
            </div>
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
                autoComplete="current-password"
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
            {errors.password && (
              <span className="text-xs text-destructive font-medium mt-0.5">{errors.password}</span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
            isLoading={isLoading}
          >
            {!isLoading && <span>Sign In</span>}
            {!isLoading && <ArrowRight size={16} />}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-bold text-primary hover:underline transition-all decoration-2"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
};

export default Login;
