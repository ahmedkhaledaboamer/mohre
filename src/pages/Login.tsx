import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LanguagesIcon, LockIcon, MailIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { useLogin } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loggedIn } from '../store/slices/authSlice';
import { languageSet } from '../store/slices/uiSlice';
import { seedUsers } from '../data/seed/people';
import { errorMessage } from '../utils/errors';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
type FormValues = z.infer<typeof schema>;

export function Login() {
  const { t, tr, lang, name } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const login = useLogin();
  const { register, handleSubmit, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'owner@wifaq-demo.ae', password: 'demo1234' }
  });

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

  return (
    <div className="grid min-h-screen w-full bg-canvas lg:grid-cols-[1fr_1.1fr]">
      <section className="relative hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold">و</span>
          <div>
            <p className="font-semibold">{tr('مركز الوفاق', 'Al Wifaq Center')}</p>
            <p className="text-xs text-white/50">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-snug">{tr('منصة موحدة للمعاملات الحكومية والمحاسبة', 'One platform for government transactions and accounting')}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {tr(
              'إدارة الإقامات واستقدام الأسر وتأسيس الشركات، مع فصل واضح بين الرسوم الحكومية المحصّلة وإيرادات المكتب الفعلية.',
              'Manage residence, family sponsorship and company formation, with a clear split between government fees collected and real office revenue.'
            )}
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
            <div>
              <dt className="text-white/45">{tr('مسارات العمل', 'Workflows')}</dt>
              <dd className="mt-1 font-semibold">{tr('قابلة للتخصيص', 'Configurable')}</dd>
            </div>
            <div>
              <dt className="text-white/45">{tr('الأسعار', 'Pricing')}</dt>
              <dd className="mt-1 font-semibold">{tr('مركزية', 'Centralized')}</dd>
            </div>
            <div>
              <dt className="text-white/45">{tr('الفواتير', 'Invoices')}</dt>
              <dd className="mt-1 font-semibold">{tr('بأسعار محفوظة', 'Price snapshots')}</dd>
            </div>
          </dl>
        </div>
        <p className="text-xs text-white/35">{tr('نسخة عرض تجريبية — جميع البيانات وهمية.', 'Demo build — all data is fictional.')}</p>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => dispatch(languageSet(lang === 'ar' ? 'en' : 'ar'))}>
            <LanguagesIcon />
            {t('common.language')}
          </Button>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <h2 className="text-2xl font-semibold">{tr('تسجيل الدخول', 'Sign in')}</h2>
          <p className="mt-1 text-sm text-muted">{tr('استخدم أحد الحسابات التجريبية أدناه.', 'Use one of the demo accounts below.')}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Field label={t('common.email')} htmlFor="email" error={formState.errors.email ? tr('بريد غير صالح', 'Invalid email') : undefined}>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="email" dir="ltr" className="ps-9 text-start" autoComplete="username" {...register('email')} aria-invalid={Boolean(formState.errors.email)} />
              </div>
            </Field>
            <Field label={tr('كلمة المرور', 'Password')} htmlFor="password" error={formState.errors.password ? tr('6 أحرف على الأقل', 'At least 6 characters') : undefined}>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="password" type="password" dir="ltr" className="ps-9 text-start" autoComplete="current-password" {...register('password')} aria-invalid={Boolean(formState.errors.password)} />
              </div>
            </Field>
            <Button type="submit" className="w-full" loading={login.isPending}>
              {tr('دخول', 'Sign in')}
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-medium text-muted">{tr('حسابات تجريبية — كلمة المرور: demo1234', 'Demo accounts — password: demo1234')}</p>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
              {seedUsers.slice(0, 6).map((u) =>
              <li key={u.id}>
                  <button
                  type="button"
                  onClick={() => {
                    setValue('email', u.email);
                    setValue('password', 'demo1234');
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start hover:bg-subtle">
                  
                    <span className="text-sm font-medium">{name(u)}</span>
                    <span className="text-xs text-muted">{t(`role.${u.role}`)}</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>);

}