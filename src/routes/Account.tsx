import { CrownIcon } from "@phosphor-icons/react";
import { AccountSignInGate } from "@/components/auth/AccountSignInGate";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import { InsetGroup } from "@/components/ui/entry/entryChrome";
import { InsetRow } from "@/components/ui/entry/InsetRow";

export function Account() {
  return (
    <EntryRouteShell title="Account">
      <AccountSignInGate
        continuePath="/account"
        description="Sign in with Google or email to use Friends, Leaderboard, Stats, and Premium."
      >
        <InsetGroup>
          <InsetRow to="/premium" label="Premium" icon={<CrownIcon size={22} weight="regular" />} />
        </InsetGroup>
      </AccountSignInGate>
    </EntryRouteShell>
  );
}
