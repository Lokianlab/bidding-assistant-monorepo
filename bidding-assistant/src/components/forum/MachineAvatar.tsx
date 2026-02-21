import { cn } from "@/lib/utils";
import {
  MACHINE_BG_COLORS,
  DEFAULT_MACHINE_BG,
} from "@/lib/forum/constants";

interface MachineAvatarProps {
  code: string;
  className?: string;
}

export function MachineAvatar({ code, className }: MachineAvatarProps) {
  const bg = MACHINE_BG_COLORS[code] || DEFAULT_MACHINE_BG;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-mono font-semibold",
        bg,
        className,
      )}
    >
      {code}
    </span>
  );
}
