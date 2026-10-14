import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, children, className = "" }: FieldProps) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`control input ${className}`.trim()} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`control select ${className}`.trim()} {...rest} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      {...rest}
    />
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function SearchField(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <div className={`search-field ${className}`.trim()}>
      <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"
        />
      </svg>
      <input className="control input search-input-inner" {...rest} />
    </div>
  );
}
