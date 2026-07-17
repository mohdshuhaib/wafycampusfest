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
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  role: 'admin' | 'captain';
  team_id: string | null;
  full_name: string | null;
}

const highlights = [
  { label: "Teams Managed", value: "12", icon: Users },
  { label: "Events Live", value: "86", icon: CalendarCheck },
  { label: "Secure Roles", value: "2", icon: ShieldCheck },
]

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (profile.role === 'admin') router.push('/admin/dashboard');
      else if (profile.role === 'captain') router.push('/captain/dashboard');
      else router.push('/');

    } catch (err: unknown) {
      console.error('Login failed:', err);
      const message = err instanceof Error ? err.message : 'Invalid login credentials';
      setError(message);
    } finally {
      setLoading(false);
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

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:px-8">
        <div className="order-2 animate-premium-in lg:order-1">
          <div className="surface-dark relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:min-h-[660px]">
            <div className="relative flex h-full flex-col justify-between gap-12">
              <div>
                <div className="flex items-center">
                  <div>
                    <div className="text-title text-xl text-ivory">Wafy Campus Kalikkav</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ivory/50">Arts Fest Portal</div>
                  </div>
                </div>

                <div className="mt-14 max-w-xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gold">
                    <Sparkles className="size-3.5" />
                    Festival operations suite
                  </div>
                  <h1 className="text-display text-4xl text-ivory sm:text-5xl lg:text-6xl">
                    Sign in to command the fest with clarity.
                  </h1>
                  <p className="mt-6 max-w-lg text-base leading-8 text-ivory/64">
                    One controlled workspace for registrations, scoring, reports, finance, assets, and captain workflows.
                  </p>
                </div>
              </div>

              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {highlights.map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="rounded-2xl border border-ivory/10 bg-ivory/8 p-4 backdrop-blur">
                        <div className="mb-4 grid size-9 place-items-center rounded-xl bg-ivory/10 text-gold">
                          <Icon className="size-4" />
                        </div>
                        <div className="text-title text-2xl text-ivory">{item.value}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ivory/48">{item.label}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gold">
                    <Trophy className="size-4" />
                    Login guidance
                  </div>
                  <p className="text-sm leading-6 text-ivory/60">
                    Admins are routed to the management console. Captains are routed to team registration and reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 animate-premium-in lg:order-2">
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
                      autoComplete="current-password"
                      className="h-12 pl-11 pr-12"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((value) => !value)}
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

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Authenticating
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
