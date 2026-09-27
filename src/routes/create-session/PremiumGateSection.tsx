import { Button, Stack, Text, TextInput } from "@mantine/core";
import { AppLink } from "../../components/navigation/AppLink";
import { PremiumSignInGate } from "../../components/billing/PremiumSignInGate";
import {
  ErrorCallout,
  InsetGroup,
} from "../../components/ui/entry/entryChrome";
import {
  filledStyles,
  insetTextInputStyles,
  plainStyles,
} from "../../components/ui/entry/entryStyles";

export interface PremiumGateSectionProps {
  requiresPremiumSignIn: boolean;
  showPremiumUnlockPanel: boolean;
  showAccessCodeField: boolean;
  accessCode: string;
  accessCodeError: string | null;
  accessCodeExpanded: boolean;
  onAccessCodeChange: (value: string) => void;
  onAccessCodeExpandedChange: (expanded: boolean) => void;
  onPremiumSignedIn: () => void;
}

export function PremiumGateSection({
  requiresPremiumSignIn,
  showPremiumUnlockPanel,
  showAccessCodeField,
  accessCode,
  accessCodeError,
  accessCodeExpanded,
  onAccessCodeChange,
  onAccessCodeExpandedChange,
  onPremiumSignedIn,
}: PremiumGateSectionProps) {
  return (
    <>
      <div
        className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
          showPremiumUnlockPanel || requiresPremiumSignIn
            ? "max-h-[120rem] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        {requiresPremiumSignIn ? (
          <PremiumSignInGate
            continuePath="/create"
            onSignedIn={onPremiumSignedIn}
          />
        ) : null}
        {showPremiumUnlockPanel ? (
          <Stack gap="sm" pt={requiresPremiumSignIn ? "sm" : 0}>
            <Text
              size="sm"
              c="var(--color-field-ink-muted)"
              style={{ lineHeight: 1.4, textWrap: "pretty" }}
            >
              Buy a session pack or subscription to host premium games.
            </Text>
            <Button
              component={AppLink}
              to="/premium"
              fullWidth
              styles={filledStyles}
            >
              View premium options
            </Button>
            <Button
              type="button"
              onClick={() => onAccessCodeExpandedChange(!accessCodeExpanded)}
              variant="subtle"
              styles={plainStyles}
              style={{ alignSelf: "flex-start" }}
            >
              {accessCodeExpanded ? "Hide access code" : "Have an access code?"}
            </Button>
          </Stack>
        ) : null}
      </div>

      <div
        className={`overflow-hidden motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none ${
          showAccessCodeField
            ? "max-h-[120rem] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <Stack gap={6} pt="sm">
          <InsetGroup error={accessCodeError != null}>
            <TextInput
              label="Host access code"
              value={accessCode}
              onChange={(event) =>
                onAccessCodeChange(event.currentTarget.value)
              }
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              styles={insetTextInputStyles}
            />
          </InsetGroup>
          <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
            Enter once. Friends join with the game code only.
          </Text>
          {accessCodeError ? (
            <ErrorCallout>{accessCodeError}</ErrorCallout>
          ) : null}
        </Stack>
      </div>
    </>
  );
}
