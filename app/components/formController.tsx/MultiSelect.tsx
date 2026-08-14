import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (val: string) => {
    const updated = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];

    onChange(updated);
  };

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label)
    .join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full flex justify-between p-1.5 px-2"
        >
          <span className="w-full font-normal line-clamp-1 flex justify-start items-start">
            {selectedLabels.length > 0 ? selectedLabels : placeholder}
          </span>

          <ChevronsUpDown className="ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 !w-full">
        <Command className="w-full">
          {/* Type-to-filter — the leader list holds dozens of names. */}
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="w-full">
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup className="w-full">
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => toggleValue(opt.value)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={value.includes(opt.value)}
                    onCheckedChange={() => toggleValue(opt.value)}
                  />

                  {/* Label */}
                  <span>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
