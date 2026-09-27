import { LegalDocumentBody } from "@/components/legal/LegalDocumentBody";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import { PRIVACY_POLICY_SECTIONS } from "@/domain/legal/privacyPolicyContent";

export function Privacy() {
  return (
    <EntryRouteShell title="Privacy">
      <LegalDocumentBody
        title="Privacy Policy"
        sections={PRIVACY_POLICY_SECTIONS}
        crossLink="privacy"
      />
    </EntryRouteShell>
  );
}
