import { ArrowLeft, ListFilter, Menu, Search, X } from "lucide-react";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import Sidebar from "./Sidebar";

// Long enough to swallow a burst of typing, short enough to still feel instant.
const SEARCH_DEBOUNCE_MS = 250;

// Explicit registry instead of `import * as LucideIcons`. The namespace import
// pulled all ~1,500 lucide icons into the chunk that every screen loads (it was
// ~580 kB of the bundle) so that the `iconName` prop could be looked up at
// runtime. Only these two are ever passed; add to the map to allow more.
const HEADER_ICONS = {
  Menu,
  ArrowLeft,
} as const;

export interface HeaderProps {
  className?: string;
  iconName?: keyof typeof HEADER_ICONS;
  title: string;
  children?: ReactNode;
  href?: string;
  description?: string;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  showSorting?: boolean;
  onBackClick?: () => void;
}

function Header({
  className,
  iconName = "Menu",
  title,
  children,
  href,
  description,
  showSearch,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  showSorting,
  onBackClick,
}: HeaderProps) {
  const navigate = useNavigate();
  const IconComponent = HEADER_ICONS[iconName] as React.ComponentType<any>;

  // The input is driven by local state and the change is pushed upward on a
  // debounce. Typing then only re-renders this input instead of re-filtering and
  // re-rendering the whole member list on every single keystroke.
  const [draftSearch, setDraftSearch] = useState(searchValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the committed value in a ref so the sync effect below can tell an
  // external reset (tab change, clear) apart from our own debounced echo.
  const committedRef = useRef(searchValue ?? "");

  useEffect(() => {
    const incoming = searchValue ?? "";
    if (incoming !== committedRef.current) {
      committedRef.current = incoming;
      setDraftSearch(incoming);
    }
  }, [searchValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const commitSearch = (value: string, immediate = false) => {
    setDraftSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const push = () => {
      committedRef.current = value;
      onSearchChange?.(value);
    };

    if (immediate) push();
    else debounceRef.current = setTimeout(push, SEARCH_DEBOUNCE_MS);
  };

  const handleIconClick = () => {
    if (href) {
      // normal navigation handled by Link
      return;
    }
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1); // go back
    }
  };

  // Icon element (wrapped in Link if href exists)
  const IconElement = href ? (
    <Link to={href}>
      <IconComponent size={20} />
    </Link>
  ) : iconName !== "Menu" ? (
    <IconComponent size={20} onClick={handleIconClick} />
  ) : (
    <Sheet>
      <SheetTrigger asChild>
        <IconComponent size={20} />
      </SheetTrigger>
      <SheetContent side={"left"} showCloseIcon={false} className="p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );

  return (
    <div
      className={cn(
        "w-full bg-primaryColor min-h-14 flex justify-between items-center text-white py-2 px-3 z-40",
        className
      )}
    >
      <div className="w-full flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-3">
          {IconElement}
          <div className="flex-1 flex flex-col justify-start items-start">
            <span className="uppercase text-base font-medium font-poppins">
              {title}
            </span>
            {description && (
              <span className="w-full text-xs text-white/70 font-normal font-poppins">
                {description}
              </span>
            )}
          </div>
        </div>

        {children && <div>{children}</div>}
      </div>

      {showSearch && onSearchChange && (
        <div className="w-full flex justify-start items-start gap-2">
          <div className="relative w-full h-10 bg-white rounded-full flex justify-start items-center gap-2 p-2 mb-1">
            <Search size={20} className="text-textLightColor" />
            <input
              type="text"
              value={draftSearch}
              onChange={(e) => commitSearch(e.target.value)}
              className="w-full bg-transparent placeholder:text-textLightColor text-textColor text-sm outline-none"
              placeholder={searchPlaceholder || "Search member..."}
            />
            {draftSearch && (
              <X
                size={20}
                onClick={() => commitSearch("", true)}
                className="text-textLightColor absolute right-3 cursor-pointer"
              />
            )}
          </div>
          {showSorting && (
            <div className="flex h-10 px-4 rounded-full justify-center items-center gap-2 border border-white">
              <ListFilter size={16} />
              <span className="uppercase text-sm select-none">sort</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(Header);
