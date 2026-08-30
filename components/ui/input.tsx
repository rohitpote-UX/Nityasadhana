import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon ? (
            <div className="pointer-events-none absolute left-4 text-[#547070]">{leftIcon}</div>
          ) : null}
          <input
            id={id}
            type={type}
            className={cn(
              "h-[52px] w-full rounded-[12px] border bg-white px-4 text-[15px] text-[#193B3B] transition-colors placeholder:text-[#547070]/60 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#F7F5EF]/60 disabled:opacity-60",
              leftIcon ? "pl-11" : "pl-4",
              rightIcon ? "pr-12" : "pr-4",
              error
                ? "border-[#B33927] focus:border-[#B33927] focus:ring-[#B33927]/20"
                : "border-[rgba(63,148,149,0.16)] hover:border-[rgba(63,148,149,0.3)] focus:border-[#3F9495] focus:ring-[#3F9495]/20",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
          {rightIcon ? (
            <div className="absolute right-3 flex items-center justify-center text-[#547070]">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p id={`${id}-error`} className="mt-1.5 text-[13px] font-medium text-[#B33927]">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${id}-helper`} className="mt-1.5 text-[13px] text-[#547070]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
