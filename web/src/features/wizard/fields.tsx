import type { InputHTMLAttributes } from 'react';

interface FieldMeta {
  /** Field name; the control id is `field-<name>`. */
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

/** `aria-describedby` value linking a control to its hint and error. */
function describedBy({ name, hint, error }: FieldMeta): string | undefined {
  const ids = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function HintAndError({ name, hint, error }: FieldMeta) {
  return (
    <>
      {hint && (
        <p id={`${name}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="field__error">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </>
  );
}

type TextFieldProps = FieldMeta & {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
} & Pick<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'min' | 'max' | 'maxLength' | 'inputMode' | 'autoComplete' | 'placeholder' | 'step'
  >;

/** Labelled text, number, date input or textarea with inline hint and error. */
export function TextField({ multiline, value, onChange, ...props }: TextFieldProps) {
  const { name, label, hint, error, ...inputProps } = props;
  const common = {
    id: `field-${name}`,
    name,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy({ name, label, hint, error }),
  };
  return (
    <div className="field" data-invalid={error ? 'true' : undefined}>
      <label htmlFor={common.id} className="field__label">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...common}
          rows={3}
          maxLength={inputProps.maxLength}
          placeholder={inputProps.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input {...common} {...inputProps} onChange={(event) => onChange(event.target.value)} />
      )}
      {multiline && inputProps.maxLength !== undefined && (
        <p className="field__counter" aria-hidden="true">
          {value.length}/{inputProps.maxLength}
        </p>
      )}
      <HintAndError name={name} label={label} hint={hint} error={error} />
    </div>
  );
}

interface SelectFieldProps<T extends string> extends FieldMeta {
  value: T;
  options: Readonly<Record<T, string>>;
  onChange: (value: T) => void;
}

/** Labelled native select. */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  ...meta
}: SelectFieldProps<T>) {
  return (
    <div className="field" data-invalid={meta.error ? 'true' : undefined}>
      <label htmlFor={`field-${meta.name}`} className="field__label">
        {meta.label}
      </label>
      <select
        id={`field-${meta.name}`}
        name={meta.name}
        value={value}
        aria-invalid={meta.error ? true : undefined}
        aria-describedby={describedBy(meta)}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {(Object.keys(options) as T[]).map((option) => (
          <option key={option} value={option}>
            {options[option]}
          </option>
        ))}
      </select>
      <HintAndError {...meta} />
    </div>
  );
}

interface ChoiceGroupProps<T extends string> extends FieldMeta {
  options: Readonly<Record<T, string>>;
}

interface RadioGroupProps<T extends string> extends ChoiceGroupProps<T> {
  value: T;
  onChange: (value: T) => void;
}

/** A fieldset of radio buttons styled as chips. */
export function RadioGroup<T extends string>({
  value,
  options,
  onChange,
  ...meta
}: RadioGroupProps<T>) {
  return (
    <fieldset
      className="field chip-group"
      aria-describedby={describedBy(meta)}
      data-invalid={meta.error ? 'true' : undefined}
    >
      <legend className="field__label">{meta.label}</legend>
      <div className="chip-group__options">
        {(Object.keys(options) as T[]).map((option) => (
          <label key={option} className="chip">
            <input
              type="radio"
              name={meta.name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{options[option]}</span>
          </label>
        ))}
      </div>
      <HintAndError {...meta} />
    </fieldset>
  );
}

interface CheckboxGroupProps<T extends string> extends ChoiceGroupProps<T> {
  values: readonly T[];
  onChange: (values: T[]) => void;
}

/** A fieldset of checkboxes styled as chips (multi-select). */
export function CheckboxGroup<T extends string>({
  values,
  options,
  onChange,
  ...meta
}: CheckboxGroupProps<T>) {
  const toggle = (option: T) =>
    onChange(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);
  return (
    <fieldset
      className="field chip-group"
      aria-describedby={describedBy(meta)}
      data-invalid={meta.error ? 'true' : undefined}
    >
      <legend className="field__label">{meta.label}</legend>
      <div className="chip-group__options">
        {(Object.keys(options) as T[]).map((option) => (
          <label key={option} className="chip">
            <input
              type="checkbox"
              name={meta.name}
              value={option}
              checked={values.includes(option)}
              onChange={() => toggle(option)}
            />
            <span>{options[option]}</span>
          </label>
        ))}
      </div>
      <HintAndError {...meta} />
    </fieldset>
  );
}
