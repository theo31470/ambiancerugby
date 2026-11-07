import type { ReactNode } from "react";

type Props = {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  placeholder?: string;
  step?: string;
};

export function Field({ name, label, defaultValue, type = "text", required, hint, className = "", placeholder, step }: Props) {
  return (
    <div className={className}>
      <label htmlFor={name} className="etiquette">{label}{required && <span className="text-alerte"> *</span>}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} step={step} className="champ" />
      {hint && <p className="text-xs text-sourdine mt-1">{hint}</p>}
    </div>
  );
}

export function Select({ name, label, defaultValue, options, required, empty, className = "" }: {
  name: string; label: string; defaultValue?: string | null; options: { value: string; label: string }[]; required?: boolean; empty?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="etiquette">{label}{required && <span className="text-alerte"> *</span>}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} required={required} className="champ">
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Area({ name, label, defaultValue, rows = 4, hint, className = "" }: { name: string; label: string; defaultValue?: string | null; rows?: number; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="etiquette">{label}</label>
      <textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} className="champ" />
      {hint && <p className="text-xs text-sourdine mt-1">{hint}</p>}
    </div>
  );
}
