"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface CheckboxProps
  extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'onChange'> {
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  indeterminate,
  checked,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const finalChecked = indeterminate ? "indeterminate" : checked;

  // Map onChange to onCheckedChange for Radix UI compatibility
  const handleCheckedChange = (newChecked: boolean | "indeterminate") => {
    if (onCheckedChange) {
      onCheckedChange(newChecked);
    }
    if (onChange && newChecked !== "indeterminate") {
      onChange(newChecked);
    }
  };

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
      checked={finalChecked as any}
      onCheckedChange={handleCheckedChange}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
