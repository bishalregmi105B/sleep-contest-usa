'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { RESERVE, hasDeadline } from '@/content/site';
import { registrationSchema, type RegistrationInput } from '@/lib/validators';
import { Field } from '@/components/ui/Field';
import { SectionHeading } from './SectionHeading';

type Status = 'idle' | 'submitting' | 'error' | 'success';

/**
 * S7 Reserve.
 *
 * Posts to /api/register, which creates a pending registration, then to
 * /api/checkout, which redirects to the ticket (mock) or to Stripe. The form
 * itself never handles a payment.
 */
export function Reserve() {
  const params = useSearchParams();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      dateOfBirth: '',
      cityState: '',
      consent: false,
      ref: '',
      company: '',
    },
  });

  // Capture ?ref=CODE so a shared link credits the referrer.
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setValue('ref', ref, { shouldValidate: false });
  }, [params, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus('submitting');
    setFormError('');

    try {
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const registerData: unknown = await registerRes.json();

      if (registerRes.status === 409) {
        const message =
          typeof registerData === 'object' && registerData !== null && 'message' in registerData
            ? String(registerData.message)
            : RESERVE.errors.duplicate;
        setStatus('error');
        setFormError(message);
        setError('email', { message });
        return;
      }

      if (!registerRes.ok) {
        if (typeof registerData === 'object' && registerData !== null && 'fields' in registerData) {
          const fields = (registerData as { fields: Record<string, string> }).fields;
          for (const [key, message] of Object.entries(fields)) {
            setError(key as keyof RegistrationInput, { message });
          }
        }
        setStatus('error');
        setFormError(RESERVE.errors.generic);
        return;
      }

      const publicId = (registerData as { publicId: string }).publicId;

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId }),
      });

      if (!checkoutRes.ok) {
        setStatus('error');
        setFormError(RESERVE.errors.generic);
        return;
      }

      const checkout = (await checkoutRes.json()) as { redirectTo: string };
      // External URL (Stripe Checkout) or an internal ticket path.
      if (checkout.redirectTo.startsWith('/')) {
        router.push(checkout.redirectTo);
      } else {
        window.location.assign(checkout.redirectTo);
      }
    } catch {
      setStatus('error');
      setFormError(RESERVE.errors.generic);
    }
  });

  const busy = isSubmitting || status === 'submitting';
  const errorList = Object.values(errors).map((e) => e?.message).filter(Boolean) as string[];

  return (
    <section id="reserve" aria-labelledby="reserve-heading" className="section-shell overflow-hidden">
      <div className="content-frame relative z-10">
        <SectionHeading title="Claim your mat" sub={RESERVE.sub} as="h2" />

        <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <form
            ref={formRef}
            noValidate
            onSubmit={onSubmit}
            className="rounded-lg border-[3px] border-ink bg-cream p-6 text-ink [box-shadow:10px_10px_0_var(--color-pillow)] sm:p-8"
            data-testid="reserve-form"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Full name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
              </div>

              <Field
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <Field
                label="Mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                error={errors.mobile?.message}
                {...register('mobile')}
              />

              <Field
                label="Date of birth"
                type="date"
                autoComplete="bday"
                required
                error={errors.dateOfBirth?.message}
                {...register('dateOfBirth')}
              />

              <Field
                label="City and state"
                autoComplete="address-level2"
                required
                maxLength={120}
                error={errors.cityState?.message}
                {...register('cityState')}
              />
            </div>

            {/* Honeypot. Hidden from people, filled by bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="company">Company</label>
              <input id="company" type="text" tabIndex={-1} autoComplete="off" {...register('company')} />
            </div>

            <input type="hidden" {...register('ref')} />

            <div className="mt-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-6 shrink-0 accent-[var(--color-pillow)]"
                  aria-invalid={errors.consent ? true : undefined}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  {...register('consent')}
                />
                <span className="text-body-sm">{RESERVE.consent}</span>
              </label>
              {errors.consent ? (
                <p id="consent-error" className="mt-2 text-body-sm font-bold text-pillow">
                  {errors.consent.message}
                </p>
              ) : null}
            </div>

            {/* Errors and status are announced without stealing focus. */}
            <div aria-live="polite" className="mt-4 empty:mt-0">
              {errorList.length > 0 || formError ? (
                <div
                  className="rounded-md border-2 border-pillow bg-pillow/10 p-4"
                  data-testid="form-errors"
                >
                  <p className="text-body-sm font-bold text-pillow">{RESERVE.errors.summary}</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {[...errorList, formError].filter(Boolean).map((message) => (
                      <li key={message} className="text-body-sm text-ink">
                        {message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="sticker-btn sticker-btn-yellow mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
              data-testid="reserve-submit"
            >
              {busy ? 'Reserving your mat…' : RESERVE.cta}
            </button>

            <p className="mt-4 text-center text-body-sm text-ink/70">
              {hasDeadline ? RESERVE.note : RESERVE.neutralRefund}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center font-mono text-xs text-ink/60">
              <span aria-hidden="true">🔒</span>
              {RESERVE.secure}
            </p>
          </form>

          <aside className="rounded-lg border-2 border-dusk bg-indigo/70 p-6 lg:sticky lg:top-24">
            <h3 className="font-display text-xl font-bold text-cream">What happens next</h3>
            <ol className="mt-4 space-y-4">
              {[
                'We email your ticket and mat number straight away.',
                `At ${new Intl.NumberFormat('en-US').format(200_000)} sleepers we announce the date and venue.`,
                'You pay the remaining $29.99 then, not before.',
                'You turn up in pajamas and try to sleep through all of it.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-zzz font-mono text-sm font-bold text-ink"
                  >
                    {index + 1}
                  </span>
                  <span className="text-body-sm text-lavender">{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}