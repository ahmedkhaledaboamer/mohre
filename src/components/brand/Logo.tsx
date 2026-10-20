import { useId } from 'react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../hooks/useI18n';

/** Official UAE flag colours. */
export const UAE = { red: '#EF3340', green: '#00843D', white: '#FFFFFF', black: '#000000' };

/** A waving band between two vertical offsets, so the stripes ripple together. */
const band = (t: number, b: number) => `M11.4 ${t} C20 ${t - 2.6} 29 ${t + 2.6} 40 ${t - 0.6} L40 ${b - 0.6} C29 ${b + 2.6} 20 ${b - 2.6} 11.4 ${b} Z`;

/**
 * Tatweer mark: the UAE flag waving on a pole with a gold finial, set in a rounded tile.
 * The flag is never mirrored in RTL — the red band always stays at the hoist.
 */
export function LogoMark({ size = 40, className }: {size?: number;className?: string;}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn('shrink-0', className)} role="img" aria-label="Tatweer">
      <defs>
        <clipPath id={`${id}-flag`}>
          <path d={band(11, 32)} />
        </clipPath>
        <linearGradient id={`${id}-fold`} x1="11" x2="40" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0.12" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`${id}-tile`} x1="0" x2="0" y1="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF2F5" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" x2="0" y1="4" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F3D77A" />
          <stop offset="1" stopColor="#B8901F" />
        </linearGradient>
      </defs>

      <rect x="0.5" y="0.5" width="47" height="47" rx="12" fill={`url(#${id}-tile)`} stroke="#D7DEE6" />

      {/* pole + finial */}
      <rect x="9" y="8.5" width="2.4" height="32" rx="1.2" fill="#0B1B2E" />
      <circle cx="10.2" cy="7.4" r="2.2" fill={`url(#${id}-gold)`} />

      {/* flag */}
      <path d={band(11, 18)} fill={UAE.green} />
      <path d={band(18, 25)} fill={UAE.white} />
      <path d={band(25, 32)} fill={UAE.black} />
      <g clipPath={`url(#${id}-flag)`}>
        <rect x="11.4" y="0" width="8.2" height="48" fill={UAE.red} />
        <rect x="11.4" y="0" width="29" height="48" fill={`url(#${id}-fold)`} />
      </g>
      <path d={band(11, 32)} fill="none" stroke="#0E1726" strokeOpacity="0.18" strokeWidth="0.6" />
    </svg>);

}

/** Thin four-colour flag ribbon used as a brand accent. */
export function FlagStripe({ className }: {className?: string;}) {
  return (
    <div className={cn('flex h-1 w-full overflow-hidden', className)} dir="ltr" aria-hidden>
      <span className="w-[22%]" style={{ background: UAE.red }} />
      <span className="flex-1" style={{ background: UAE.green }} />
      <span className="flex-1" style={{ background: UAE.white }} />
      <span className="flex-1" style={{ background: UAE.black }} />
    </div>);

}

/** Full logo: mark + bilingual wordmark. `tone="light"` for dark backgrounds. */
export function Logo({ size = 40, tone = 'dark', compact, className }: {size?: number;tone?: 'dark' | 'light';compact?: boolean;className?: string;}) {
  const { t, lang } = useI18n();
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      {!compact &&
      <span className="min-w-0 leading-tight">
          <span className={cn('block truncate font-extrabold tracking-tight', tone === 'light' ? 'text-white' : 'text-ink')} style={{ fontSize: size * 0.48 }}>
            {t('app.name')}
          </span>
          <span className={cn('block truncate', tone === 'light' ? 'text-white/55' : 'text-muted')} style={{ fontSize: Math.max(10, size * 0.27) }}>
            {lang === 'ar' ? 'TATWEER · ' : 'تطوير · '}
            {t('app.tagline')}
          </span>
        </span>
      }
    </span>);

}
