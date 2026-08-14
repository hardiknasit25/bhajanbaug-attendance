import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import type { HeaderProps } from "./Header";
import Header from "./Header";
import Tab from "./Tab";

function LayoutWrapper({
  children,
  showHeader = true,
  showTab = true,
  headerConfigs,
  className,
}: {
  children: ReactNode;
  showHeader?: boolean;
  showTab?: boolean;
  headerConfigs?: HeaderProps;
  className?: string;
}) {
  return (
    <div className="relative h-dvh w-full flex flex-col overflow-hidden">
      {/* Header */}
      {showHeader && headerConfigs && (
        <div className="sticky top-0 right-0 z-10 flex-shrink-0">
          <Header
            className={headerConfigs.className}
            title={headerConfigs.title}
            iconName={headerConfigs.iconName}
            href={headerConfigs.href}
            description={headerConfigs.description}
            showSearch={headerConfigs.showSearch}
            searchValue={headerConfigs.searchValue}
            searchPlaceholder={headerConfigs.searchPlaceholder}
            onSearchChange={headerConfigs.onSearchChange}
            showSorting={headerConfigs.showSorting}
            onBackClick={headerConfigs.onBackClick}
          >
            {headerConfigs.children}
          </Header>
        </div>
      )}

      <div
        className={cn(
          `flex-1 overflow-x-hidden`,
          showTab ? "mb-16" : "",
          className || ""
        )}
      >
        {children}
      </div>

      {/* Bottom Tab Bar - Fixed positioning - Always at bottom when showTab is true */}
      {showTab && (
        <div className="fixed bottom-0 left-0 right-0 z-20 w-full">
          <Tab />
        </div>
      )}
    </div>
  );
}

export default LayoutWrapper;
