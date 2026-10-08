'use client';

import { forwardRef, useId } from 'react';

/**
 * Form field with a label, an inline error tied by `aria-describedby`, and a
 * polite live region so the error is announced when it appears.
 */
export const Field = forwardRef<
  HTMLInputElement,
  {
    readonly name: string;
    readonly label: string;
    readonly type?: string;
    readonly autoComplete?: string;
    readonly inputMode?: 'text' | 'email' | 'tel' | 'numeric';
    readonly error?: string;
    readonly required?: boolean;
    readonly placeholder?: string;
    readonly maxLength?: number;
  }
>(function Field(
  { name, label, type = 'text', autoComplete, inputMode, error, required, placeholder, maxLength },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-bold text-ink">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-pillow">
            *
          </span>
        ) : null}
      </label>

      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 rounded-md border-[3px] bg-white px-4 py-3 text-base text-ink transition-colors placeholder:text-ink/40 ${
          error ? 'border-pillow' : 'border-ink'
        }`}
      />

      {error ? (
        <p id={errorId} className="text-body-sm font-bold text-pillow">
          {error}
        </p>
      ) : null}
    </div>
  );
});