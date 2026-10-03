/**
 * Explicit v10-equivalent Sentry `dataCollection` baseline for SDK 11.
 * Unset dataCollection on v11 collects more categories by default.
 * @see https://docs.sentry.io/platforms/javascript/guides/react/migration/v10-to-v11/
 */
export const CLIENT_SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
  httpBodies: [] as const,
  urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  graphQL: { document: false, variables: false },
} as const;
