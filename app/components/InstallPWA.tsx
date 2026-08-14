import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import {
  dismissBannerForever,
  isBannerDismissed,
  promptInstall,
  useInstallAvailable,
} from "../utils/installPrompt";

// Floating install banner. Shows only while the browser offers installation,
// and once the user closes it it never auto-shows again (localStorage flag) —
// after that the drawer's "Install App" button is the way to install.
export const InstallPWA = () => {
  const installAvailable = useInstallAvailable();
  const [dismissed, setDismissed] = useState(true);

  // Read the persisted flag on the client only (SSR has no localStorage).
  useEffect(() => {
    setDismissed(isBannerDismissed());
  }, []);

  const handleDismiss = () => {
    dismissBannerForever();
    setDismissed(true);
  };

  const handleInstallClick = async () => {
    await promptInstall();
  };

  if (!installAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-3 right-3 z-50 bg-primaryColor rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-2 md:bottom-4">
      <div className="flex justify-between items-center gap-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-white">
            Install Bhajanbaug Sabha App
          </h3>
          <p className="text-xs text-textLightColor font-normal">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex items-center">
          <Button
            variant="default"
            onClick={handleInstallClick}
            size="sm"
            className="bg-white hover:bg-white text-textColor"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="default"
            size="sm"
            className="text-white bg-transparent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
