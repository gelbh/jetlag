import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEAL_WRAP_KEY_ID_TEST,
  type SealCipherEnvelopeV1,
  TEST_SEAL_WRAP_KEY_BYTES,
} from "@/domain/session/castleSiege/sealCipher";
import { jetlagTheme } from "@/theme/theme";
import { SealVault } from "./SealVault";

const writeTeamSealHash = vi.fn();
const writeTeamSealCipher = vi.fn();

vi.mock("@/services/firestore/firestoreSessions", () => ({
  writeTeamSealHash: (...args: unknown[]) => writeTeamSealHash(...args),
  writeTeamSealCipher: (...args: unknown[]) => writeTeamSealCipher(...args),
}));

function renderVault(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

async function fillAndCommit(anchor: string, secret: string) {
  fireEvent.change(screen.getByLabelText("Anchor name"), { target: { value: anchor } });
  fireEvent.change(screen.getByLabelText("Secret phrase"), { target: { value: secret } });
  fireEvent.click(screen.getByRole("button", { name: /commit seal/i }));
}

describe("SealVault", () => {
  beforeEach(() => {
    writeTeamSealHash.mockReset();
    writeTeamSealCipher.mockReset();
    writeTeamSealHash.mockResolvedValue(undefined);
    writeTeamSealCipher.mockResolvedValue(undefined);
  });

  it("commits hash-only when no wrappingKey is injected", async () => {
    renderVault(
      <SealVault
        sessionId="s1"
        teamId="teamA"
        sealedByUid="u1"
        sealPosition={{ lat: 53.35, lng: -6.26 }}
      />,
    );

    await fillAndCommit("Castle", "s3cret");

    await waitFor(() => expect(writeTeamSealHash).toHaveBeenCalledTimes(1));
    expect(writeTeamSealCipher).not.toHaveBeenCalled();
    expect(writeTeamSealHash.mock.calls[0]?.[1]).toMatchObject({
      teamId: "teamA",
      sealedByUid: "u1",
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("commits hash + ciphertext when wrappingKey is injected", async () => {
    const envelope: SealCipherEnvelopeV1 = {
      v: 1,
      alg: "A256GCM",
      keyId: SEAL_WRAP_KEY_ID_TEST,
      iv: "aXY=",
      ciphertext: "Y2lwaGVy",
      wrappedKey: "d3JhcA==",
      wrapIv: "d3JhcEl2",
    };
    const encryptSeal = vi.fn().mockResolvedValue(envelope);

    renderVault(
      <SealVault
        sessionId="s1"
        teamId="teamB"
        sealedByUid="u2"
        sealPosition={{ lat: 53.35, lng: -6.26 }}
        wrappingKey={TEST_SEAL_WRAP_KEY_BYTES}
        wrapKeyId={SEAL_WRAP_KEY_ID_TEST}
        encryptSeal={encryptSeal}
      />,
    );

    await fillAndCommit("Keep", "phrase");

    await waitFor(() => expect(writeTeamSealCipher).toHaveBeenCalledTimes(1));
    expect(writeTeamSealHash).not.toHaveBeenCalled();
    expect(encryptSeal).toHaveBeenCalledWith(
      expect.stringContaining("Keep|"),
      expect.objectContaining({
        wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
        keyId: SEAL_WRAP_KEY_ID_TEST,
      }),
    );
    expect(writeTeamSealCipher.mock.calls[0]?.[1]).toMatchObject({
      teamId: "teamB",
      ciphertext: envelope,
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});
