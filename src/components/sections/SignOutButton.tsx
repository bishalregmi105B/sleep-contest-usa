'use client';

import { useRouter } from 'next/navigation';
import { ADMIN } from '@/content/site';

/**
 * Clears the admin session cookie through the server action on the page, then
 * refreshes so the gate renders again.
 */
export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="submit"
      className="inline-flex min-h-11 items-center rounded-pill border-2 border-dusk px-5 text-body-sm font-bold text-cream hover:bg-dusk/40"
      onClick={() => {
        // The server action clears the cookie; refresh re-renders the gate.
        setTimeout(() => router.refresh(), 0);
      }}
    >
      {ADMIN.signOut}
    </button>
  );
}