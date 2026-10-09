'use client';

import { forwardRef, useId } from 'react';

/**
 * Form field with a label above it, an inline error tied by `aria-describedby`,
 * and a polite live region so the error is announced when it appears.
 *
 * Every other prop is spread onto the input. That is load-bearing: React Hook
 * Form's `register()` returns `{ name, ref, onChange, onBlur }`, and dropping
 * the two handlers silently produces a form where every field validates as empty
 * no matter what was typed.
 *
 * The error sits in a fixed-height slot so validating one field never shifts
 * the ones below it; that is what keeps CLS at zero while a form is in use.
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
  } & Omit<React.ComponentPropsWithoutRef<'input'>, 'name' | 'type'>
>(function Field(
  { name, label, type = 'text', autoComplete, inputMode, error, required, placeholder, maxLength, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-paper">
        {label}
        {required ? <span className="ml-0.5 text-signal">*</span> : null}
      </label>

      <input
        {...rest}
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
        className={`min-h-11 w-full rounded-[10px] border bg-white/[0.06] px-4 py-3 text-base text-paper transition-colors duration-200 placeholder:text-mist/35 ${
          error ? 'border-alert' : 'border-white/20 hover:border-white/30'
        }`}
      />

      {/* Reserved space: an empty paragraph rather than nothing, so showing an
          error does not move the rest of the form. */}
      <p id={errorId} className="min-h-5 text-sm text-alert" role={error ? 'alert' : undefined}>
        {error ?? ''}
      </p>
    </div>
  );
});