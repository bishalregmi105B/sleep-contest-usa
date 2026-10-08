'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN } from '@/content/site';

/**
 * Admin password gate.
 *
 * Posts to /api/admin/login, which compares in constant time and sets a signed
 * httpOnly cookie. The password never reaches this component's state after a
 * failed attempt.
 */
export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setPassword('');
        router.refresh();
        return;
      }

      setError(ADMIN.wrongPassword);
    } catch {
      setError(ADMIN.wrongPassword);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-sm rounded-lg border-2 border-dusk bg-indigo/80 p-8"
    >
      <h1 className="font-display text-2xl font-black uppercase text-cream">
        {ADMIN.title}
      </h1>
      <p className="mt-2 text-body-sm text-lavender">Sign in to see registrations.</p>

      <div className="mt-6 flex flex-col gap-1.5">
        <label htmlFor="admin-password" className="text-body-sm font-bold text-cream">
          {ADMIN.password}
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'admin-error' : undefined}
          className="min-h-12 rounded-md border-[3px] border-ink bg-white px-4 text-base text-ink"
        />
      </div>

      {error ? (
        <p id="admin-error" role="alert" className="mt-2 text-body-sm font-bold text-pillow">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="sticker-btn mt-6 w-full disabled:opacity-70"
        data-testid="admin-submit"
      >
        {busy ? 'Checking…' : ADMIN.signIn}
      </button>
    </form>
  );
}