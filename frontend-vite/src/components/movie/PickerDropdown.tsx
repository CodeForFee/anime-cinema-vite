
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../lightswind/dropdown-menu";
import { cn } from "../../lib/utils";

export interface PickerOption {
  key: string;
  label: string;
  hint?: string;
}

// Netflix-style boxed picker ("Mùa 1 ▾") used for seasons and episode ranges
export const PickerDropdown: React.FC<{
  label: string;
  options: PickerOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}> = ({ label, options, selectedKey, onSelect }) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="flex items-center gap-5 rounded-[4px] border border-[#4d4d4d] bg-[#242424] px-4 py-2 text-base sm:text-lg font-bold text-white hover:border-white/70 transition-colors">
        <span className="max-w-[180px] truncate">{label}</span>
        <span
          className={cn(
            "border-x-[6px] border-x-transparent border-t-[7px] border-t-white transition-transform",
            open && "rotate-180"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={2}
        className="info-modal-picker max-w-[min(360px,90vw)] rounded-none border-[#4d4d4d] bg-[#242424] p-0 py-2 text-white shadow-2xl"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => {
              setOpen(false);
              onSelect(option.key);
            }}
            className={cn(
              "cursor-pointer items-baseline gap-2 rounded-none px-5 py-2.5 hover:bg-[#424242]",
              option.key === selectedKey && "bg-[#333]"
            )}
          >
            <span className="whitespace-nowrap text-base sm:text-lg font-bold">{option.label}</span>
            {option.hint && <span className="truncate text-sm text-[#d2d2d2]">{option.hint}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
