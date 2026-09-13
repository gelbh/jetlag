import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import { ScreenHeader } from "../components/ui/layout/ScreenHeader";
import { PremiumPageContent } from "./PremiumPageContent";

export function PremiumLegacy() {
  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Back" />
      <DesktopContentColumn maxWidth="entry" className="flex flex-col gap-4">
        <PremiumPageContent />
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
