'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  role: 'admin' | 'captain';
  team_id: string | null;
  full_name: string | null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || redirecting) return;
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user found');

      const { data: rawData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const profile = rawData as UserProfile | null;

      if (!profile) {
        throw new Error('Profile not found. Please contact administrator.');
      }

      setRedirecting(true);
      if (profile.role === 'admin') router.replace('/admin/dashboard');
      else if (profile.role === 'captain') router.replace('/captain/dashboard');
      else router.replace('/');
      router.refresh();

    } catch (err: unknown) {
      console.error('Login failed:', err);
      const message = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(message);
      setLoading(false);
      setRedirecting(false);
    } finally {
    }
  };

  return (
    <main className="app-shell relative min-h-screen overflow-hidden text-navy">
      <div className="pointer-events-none absolute inset-0 premium-grid opacity-45" />

      <header className="relative z-20 flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slatebrand transition hover:text-navy">
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center px-4 pb-10 sm:px-6 lg:px-8">
        <div className="w-full animate-premium-in">
          <div className="surface-elevated mx-auto w-full max-w-xl rounded-[2rem] p-5 sm:p-7">
            <div className="rounded-[1.5rem] border border-navy/10 bg-ivory/72 p-5 sm:p-7">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="eyebrow">Portal Login</div>
                  <h2 className="text-title mt-3 text-3xl text-navy">Welcome back</h2>
                  <p className="mt-3 text-sm leading-6 text-slatebrand">
                    Enter your credentials to continue to your assigned dashboard.
                  </p>
                </div>
                <div className="grid size-12 place-items-center rounded-2xl bg-navy text-gold shadow-premium">
                  <LockKeyhole className="size-5" />
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.12em] text-slatebrand" htmlFor="email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="captain@wafyfest.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading || redirecting}
                      autoComplete="email"
                      className="h-12 pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.12em] text-slatebrand" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading || redirecting}
                      autoComplete="current-password"
                      className="h-12 pl-11 pr-12"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={loading || redirecting}
                      className="focus-premium absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slatebrand transition hover:bg-navy/7 hover:text-navy"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slatebrand">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={loading || redirecting}
                      className="size-4 rounded border-navy/20 accent-[#0A1D2C]"
                    />
                    Remember this device
                  </label>
                </div>

                {error && (
                  <div className="animate-premium-in flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                    <AlertCircle className="mt-0.5 size-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading || redirecting} aria-busy={loading || redirecting}>
                  {loading || redirecting ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {redirecting ? "Opening dashboard" : "Authenticating"}
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-slatebrand">
              Protected by campus administration. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
