/**
 * Explicit v10-equivalent Sentry `dataCollection` baseline for SDK 11.
 * Unset dataCollection on v11 collects more categories by default.
 * Mutable arrays: Sentry's DataCollection types reject readonly tuples.
 * @see https://docs.sentry.io/platforms/javascript/guides/react/migration/v10-to-v11/
 */
const SENSITIVE_DENY = ["forwarded", "-ip", "remote-", "via", "-user"];

export const CLIENT_SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: [...SENSITIVE_DENY] },
    response: { deny: [...SENSITIVE_DENY] },
  },
  httpBodies: [] as [],
  urlQueryParams: { deny: [...SENSITIVE_DENY] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  graphQL: { document: false, variables: false },
};
