import type { ReactNode } from "react";

/**
 * Label + control + constraint/error text wrapper -- adopted from admin_fe's
 * RequestWizard form pattern (per-field label, gray helper text below,
 * replaced by a red inline error on invalid) so this app's one real
 * multi-field form (AddCustomEventModal) gets the same clarity instead of a
 * single generic error line at the bottom. Visual tokens stay this app's own
 * (DESIGN.md ranks repository facts over reference inspiration) -- only the
 * label/helper/error structure is borrowed.
 */
export function FormField({
  label,
  constraintText,
  errorText,
  htmlFor,
  children,
}: {
  label: string;
  constraintText?: string;
  errorText?: string | null;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {errorText ? (
        <p role="alert" className="mt-1 text-xs text-error">
          {errorText}
        </p>
      ) : constraintText ? (
        <p className="mt-1 text-xs text-text-secondary">{constraintText}</p>
      ) : null}
    </div>
  );
}
