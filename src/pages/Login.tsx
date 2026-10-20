import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { BarChart3Icon, EyeIcon, EyeOffIcon, LanguagesIcon, LockIcon, MailIcon, ShieldCheckIcon, WalletIcon, LandmarkIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { FlagStripe, Logo } from '../components/brand/Logo';
import { SkylineArt } from '../components/brand/SkylineArt';
import { Avatar } from '../components/ui/Display';
import { useLogin } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn } from '../store/slices/authSlice';
import { languageSet } from '../store/slices/uiSlice';
import { seedUsers } from '../data/seed/people';
import { errorMessage } from '../utils/errors';
import { cn } from '../utils/cn';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type FormValues = z.infer<typeof schema>;

export function Login() {
  const { t, tr, lang, name } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const login = useLogin();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, setValue, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: seedUsers[0].email, password: 'demo1234' }
  });
  const email = watch('email');

  if (user) return <Navigate to="/" replace />;

  const onSubmit = (v: FormValues) =>
  login.mutate(v, {
    onSuccess: (u) => {
      dispatch(loggedIn(u));
      toast.success(tr(`مرحباً ${u.nameAr}`, `Welcome, ${u.nameEn}`));
      const from = (location.state as {from?: string;} | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e, lang))
  });

  const features = [
  { icon: LandmarkIcon, title: tr('تسجيل المعاملات اليومية', 'Daily transaction logging'), text: tr('معاملة كاملة في أقل من دقيقة، مع العميل والشركة والمستفيد.', 'A full transaction in under a minute.') },
  { icon: WalletIcon, title: tr('تحصيل ومدفوعات منفصلة', 'Separate collections & payments'), text: tr('كل درهم بسند مستقل، دون خلط الرسوم الحكومية بأتعاب المكتب.', 'Every dirham on its own voucher.') },
  { icon: BarChart3Icon, title: tr('ماذا حدث اليوم؟', 'What happened today?'), text: tr('لوحة المالك محسوبة من العمليات الفعلية لحظة بلحظة.', 'Owner dashboard from real operations.') }];


  return (
    <div className="grid h-dvh w-full overflow-hidden bg-canvas lg:grid-cols-[1.2fr_1fr]">
      {/* Visual panel */}
      <section className="relative hidden h-full overflow-hidden bg-navy text-white lg:block">
        <div className="absolute inset-0">
          <SkylineArt />
          <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy/75 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(15,127,129,0.35),transparent_60%)]" />
        </div>
        <FlagStripe className="absolute inset-x-0 top-0 z-10 h-1.5" />
        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <Logo size={48} tone="light" />
          <div className="mt-[9vh] max-w-lg">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-[#9FD8D4]" />
              {tr('منصة مكاتب الخدمات الحكومية — دبي', 'Government services office platform — Dubai')}
            </p>
            <h1 className="text-[clamp(28px,3vw,42px)] font-bold leading-[1.3]">
              {tr('أدِر مكتبك', 'Run your office')}{' '}
              <span className="bg-gradient-to-l from-[#9FD8D4] to-white bg-clip-text text-transparent">{tr('بوضوح ودقة كل يوم', 'with clarity, every day')}</span>
            </h1>
            <ul className="mt-7 grid gap-3">
              {features.map((f) =>
              <li key={f.title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 backdrop-blur-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <f.icon className="h-4 w-4 text-[#9FD8D4]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{f.title}</span>
                    <span className="block truncate text-xs text-white/60">{f.text}</span>
                  </span>
                </li>
              )}
            </ul>
          </div>
          <p className="mt-auto text-xs text-white/45">{tr('نسخة تجريبية — جميع البيانات والأسماء وهمية.', 'Demo build — all data and names are fictional.')}</p>
        </div>
      </section>

      {/* Form panel — sized to the viewport, no page scroll */}
      <section className="relative flex h-full flex-col overflow-hidden">
        <FlagStripe className="lg:hidden" />
        <div className="flex shrink-0 items-center justify-between px-6 pt-5 sm:px-10">
          <Logo size={36} className="lg:invisible" />
          <Button variant="ghost" size="sm" onClick={() => dispatch(languageSet(lang === 'ar' ? 'en' : 'ar'))}>
            <LanguagesIcon />
            {t('common.language')}
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-[400px]">
            <h2 className="text-[26px] font-bold tracking-tight">{tr('تسجيل الدخول', 'Sign in')}</h2>
            <p className="mt-1 text-sm text-muted">{tr('أهلاً بك في تطوير — أدخل بياناتك للمتابعة.', 'Welcome to Tatweer — enter your details to continue.')}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <Field label={t('common.email')} htmlFor="email" error={formState.errors.email ? tr('بريد غير صالح', 'Invalid email') : undefined}>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input id="email" dir="ltr" className="h-11 bg-surface ps-9 text-start" autoComplete="username" {...register('email')} aria-invalid={Boolean(formState.errors.email)} />
                </div>
              </Field>
              <Field label={tr('كلمة المرور', 'Password')} htmlFor="password" error={formState.errors.password ? tr('6 أحرف على الأقل', 'At least 6 characters') : undefined}>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input id="password" type={showPw ? 'text' : 'password'} dir="ltr" className="h-11 bg-surface pe-10 ps-9 text-start" autoComplete="current-password" {...register('password')} aria-invalid={Boolean(formState.errors.password)} />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink" aria-label={showPw ? tr('إخفاء كلمة المرور', 'Hide password') : tr('إظهار كلمة المرور', 'Show password')}>
                    {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Button type="submit" className="h-11 w-full text-[15px] shadow-md shadow-primary/20" loading={login.isPending}>
                {tr('دخول', 'Sign in')}
              </Button>
            </form>

            <div className="mt-7">
              <div className="mb-2.5 flex items-center gap-3 text-[11px] text-muted">
                <span className="h-px flex-1 bg-line" />
                {tr('دخول سريع بحساب تجريبي', 'Quick demo sign-in')}
                <span className="num rounded bg-subtle px-1.5 py-0.5">demo1234</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {seedUsers.map((u) =>
                <button
                  key={u.id}
                  type="button"
                  title={`${name(u)} — ${t(`role.${u.role}`)}`}
                  onClick={() => {
                    setValue('email', u.email, { shouldValidate: true });
                    setValue('password', 'demo1234');
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border py-1 pe-3 ps-1 text-xs transition-colors',
                    email === u.email ? 'border-primary bg-primary-soft text-primary-strong' : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                  )}>

                    <Avatar name={name(u)} className="h-6 w-6 text-[10px]" />
                    {t(`role.${u.role}`)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <p className="shrink-0 pb-4 text-center text-[11px] text-muted">© {new Date().getFullYear()} {tr('تطوير لخدمات رجال الأعمال — دبي', 'Tatweer Business Services — Dubai')}</p>
      </section>
    </div>);

}
