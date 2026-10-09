'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { RESERVE, hasDeadline } from '@/content/site';
import { registrationSchema, type RegistrationInput } from '@/lib/validators';
import { stripeLive } from '@/lib/env-public';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from './SectionHeading';
import { SectionScrim } from './SectionScrim';
import { RulesSummary } from './RulesSummary';
import { Timeline } from './Timeline';
import { TrustStrip } from './TrustStrip';

type Status = 'idle' | 'submitting' | 'error' | 'success';

/**
 * S7 Reserve.
 *
 * Posts to /api/register, which creates a pending registration, then to
 * /api/checkout, which redirects to the ticket (mock) or to Stripe. The form
 * itself never handles a payment.
 *
 * Validation runs after blur, the entered values survive a server error, and
 * the error summary is announced without stealing focus.
 */
export function Reserve() {
  const params = useSearchParams();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
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

    // A form that cannot possibly reach the network should say so rather than
    // fail with a generic error.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('error');
      setFormError(RESERVE.errors.offline);
      return;
    }

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
  const hasErrors = errorList.length > 0 || formError !== '';

  return (
    <section id="reserve" aria-labelledby="reserve-heading" className="section-shell overflow-hidden">
      <SectionScrim />
      <div className="content-frame relative z-10">
        <SectionHeading title={RESERVE.title} sub={RESERVE.sub} as="h2" />

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <Card className="p-6 sm:p-8">
            <form
              ref={formRef}
              noValidate
              onSubmit={onSubmit}
              aria-describedby={hasErrors ? 'reserve-error-summary' : undefined}
              data-testid="reserve-form"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label={RESERVE.fields.fullName}
                    autoComplete="name"
                    required
                    maxLength={80}
                    error={errors.fullName?.message}
                    {...register('fullName')}
                  />
                </div>

                <Field
                  label={RESERVE.fields.email}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Field
                  label={RESERVE.fields.mobile}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  error={errors.mobile?.message}
                  {...register('mobile')}
                />

                <Field
                  label={RESERVE.fields.dateOfBirth}
                  type="date"
                  autoComplete="bday"
                  required
                  error={errors.dateOfBirth?.message}
                  {...register('dateOfBirth')}
                />

                <Field
                  label={RESERVE.fields.cityState}
                  autoComplete="address-level2"
                  required
                  maxLength={120}
                  error={errors.cityState?.message}
                  {...register('cityState')}
                />
              </div>

              {/*
                Honeypot. Bots fill it, people never see it, and it carries no
                visible label: the old version had a real <label>Company</label>
                sitting off-screen, which put the word "Company" in the page text
                and in every accessibility tree.
              */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <input
                  id="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('company')}
                />
              </div>

              <input type="hidden" {...register('ref')} />

              <div className="mt-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 accent-[var(--color-signal)]"
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                    {...register('consent')}
                  />
                  <span className="text-sm leading-relaxed text-mist">{RESERVE.consent}</span>
                </label>
                {errors.consent ? (
                  <p id="consent-error" className="mt-2 text-sm text-alert">
                    {errors.consent.message}
                  </p>
                ) : null}
              </div>

              {/* Errors and status are announced without stealing focus. */}
              <div aria-live="polite" className="mt-4 empty:mt-0">
                {hasErrors ? (
                  <div
                    ref={summaryRef}
                    id="reserve-error-summary"
                    role="alert"
                    tabIndex={-1}
                    className="rounded-[10px] border border-alert/40 bg-alert/10 p-4"
                    data-testid="form-errors"
                  >
                    <p className="text-sm font-bold text-alert">{RESERVE.errors.summary}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {[...errorList, formError].filter(Boolean).map((message) => (
                        <li key={message} className="text-sm text-paper">
                          {message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <Button type="submit" disabled={busy} className="mt-6 w-full" data-testid="reserve-submit">
                {busy ? RESERVE.submitting : RESERVE.cta}
              </Button>

              <p className="mt-4 text-center text-sm leading-relaxed text-mist/70">
                {hasDeadline ? RESERVE.note : RESERVE.neutralRefund}
              </p>

              <TrustStrip stripeLive={stripeLive} />
            </form>
          </Card>

          <div className="space-y-6 lg:sticky lg:top-24">
            <RulesSummary />
            <Card className="p-6">
              <Timeline heading={false} columns={1} />
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}