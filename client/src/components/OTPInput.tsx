import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function OTPInput({ value, onChange, disabled }: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").slice(0, 6).split("");

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < 6) {
      inputs.current[index]?.focus();
    }
  }, []);

  const updateDigit = useCallback((index: number, digit: string) => {
    const newDigits = [...digits];
    newDigits[index] = digit;
    onChange(newDigits.join(""));
  }, [digits, onChange]);

  const handleChange = useCallback((index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    updateDigit(index, digit);
    if (index < 5) {
      focusInput(index + 1);
    }
  }, [updateDigit, focusInput]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        updateDigit(index, "");
      } else if (index > 0) {
        updateDigit(index - 1, "");
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      focusInput(index + 1);
    }
  }, [digits, updateDigit, focusInput]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted.padEnd(6, "").slice(0, 6));
      focusInput(Math.min(pasted.length, 5));
    }
  }, [onChange, focusInput]);

  return (
    <div className="flex gap-3 justify-center" dir="ltr">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 text-center text-xl font-semibold rounded-xl bg-[var(--bg)] border-2 border-[var(--border)] text-[var(--text-main)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all disabled:opacity-50"
          aria-label={`Digit ${i + 1}`}
          data-testid={`otp-digit-${i}`}
        />
      ))}
    </div>
  );
}
