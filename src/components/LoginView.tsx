import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Wheat
} from 'lucide-react';
import { storage } from '../services/storage';
import { AuthSession } from '../types';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenSupabaseModal?: () => void;
  supabaseConnected?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await storage.loginWithEmailPassword(email, password);
      if (result.success && result.session) {
        onLoginSuccess(result.session);
      } else {
        setError(result.error || 'Invalid credentials. Please verify your Supabase account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center relative overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans selection:bg-slate-900 selection:text-white p-4 sm:p-6">
      
      {/* 1. Apple / Samsung Style Ambient Color Mesh for Glassmorphic Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Pearlescent Emerald Orb */}
        <div 
          className="absolute -top-32 -left-20 w-[480px] h-[480px] rounded-full blur-[100px] opacity-40 mix-blend-multiply transition-all"
          style={{ background: 'radial-gradient(circle, #86efac 0%, #a7f3d0 50%, transparent 70%)' }}
        />
        {/* Soft Lavender / Sky Orb */}
        <div 
          className="absolute top-1/3 -right-28 w-[520px] h-[520px] rounded-full blur-[120px] opacity-40 mix-blend-multiply"
          style={{ background: 'radial-gradient(circle, #bae6fd 0%, #cbd5e1 50%, transparent 70%)' }}
        />
        {/* Warm Golden Glow Orb */}
        <div 
          className="absolute -bottom-32 left-1/4 w-[460px] h-[460px] rounded-full blur-[110px] opacity-30 mix-blend-multiply"
          style={{ background: 'radial-gradient(circle, #fde68a 0%, #fed7aa 50%, transparent 70%)' }}
        />
        {/* Ultra-subtle micro dot matrix */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.25]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="apple-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#apple-dots)" />
        </svg>
      </div>

      {/* Top Spacer for perfect vertical centering */}
      <div className="w-full h-6" />

      {/* 2. Frosted Glassmorphism Card (Apple / Samsung OneUI Style) */}
      <div className="w-full max-w-[400px] relative z-20">
        
        {/* Frosted Container */}
        <div className="relative rounded-[32px] bg-white/70 backdrop-blur-2xl border border-white/90 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] ring-1 ring-slate-900/[0.04] p-8 sm:p-9 transition-all duration-300">
          
          {/* Brand Monogram Icon */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-white/90 border border-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] backdrop-blur-md flex items-center justify-center text-emerald-600 mb-3.5 transition-transform hover:scale-105 duration-200">
              <Wheat className="w-7 h-7 stroke-[1.8]" />
            </div>
            
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Shivkrupa Trading Co.
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              शिवकृपा ट्रेडिंग कंपनी • APMC Grain Trade
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50/80 backdrop-blur-sm border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 pl-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/70 hover:bg-white/90 focus:bg-white border border-slate-200/80 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/[0.04] focus:border-slate-400 backdrop-blur-md transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 pl-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white/70 hover:bg-white/90 focus:bg-white border border-slate-200/80 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/[0.04] focus:border-slate-400 backdrop-blur-md transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0 w-3.5 h-3.5 accent-slate-900"
                />
                <span>Stay signed in</span>
              </label>
            </div>

            {/* Apple / Samsung Style Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-2 rounded-2xl bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In (प्रवेश करा)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

      {/* 3. Ultra Minimalist Clean Footer */}
      <footer className="w-full text-center py-4 text-slate-400 text-[11px] font-medium z-20">
        Shivkrupa Trading Company • Kalamna Mandi & Hingna MIDC, Nagpur
      </footer>

    </div>
  );
};
