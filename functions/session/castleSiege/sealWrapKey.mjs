import { defineSecret } from "firebase-functions/params";

/**
 * GSM secret: base64 of 32 raw AES-256 wrap-key bytes.
 * Param name must stay `CASTLE_SIEGE_SEAL_WRAP_KEY` (see CONTRIBUTING.md).
 * Never print `.value()` in logs, tests, or chat.
 */
export const castleSiegeSealWrapKey = defineSecret("CASTLE_SIEGE_SEAL_WRAP_KEY");
