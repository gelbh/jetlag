export const appUpdateCopy = {
  deferredTitle: "Update waiting",
  readyTitle: "Update ready",
  readyAction: "Refresh now",
  chunkDeferredBody: "Installs when this game ends",
  chunkReadyBody: "Refresh to load the latest map",
  mapErrorTitle: "Map failed to load",
  mapErrorReload: "Refresh now",
  mapErrorBackHome: "Back home",
  leaveAndUpdateBody:
    "Leave this device's session, then install the new build. Others keep playing.",
  leaveAndUpdateAction: "Leave & refresh",
  leaveAndUpdateBusy: "Leaving…",
  leaveAndUpdateConfirmTitle: "Leave & refresh",
  leaveAndUpdateConfirmMember: "Leave this session on this device? Other players can keep playing.",
  leaveAndUpdateConfirmHostPromote:
    "Another player will become host so others can keep playing, then this device installs the update.",
  leaveAndUpdateConfirmHostAlone:
    "You're the only player. Leaving will end this session, then install the update.",
} as const;

export type LeaveAndUpdatePrompt = {
  title: string;
  body: string;
};

export function resolveLeaveAndUpdatePrompt(options: {
  isLocalSession: boolean;
  isRemoteHost: boolean;
  aloneHost: boolean;
}): LeaveAndUpdatePrompt {
  const title = appUpdateCopy.leaveAndUpdateConfirmTitle;
  if (options.isLocalSession || !options.isRemoteHost) {
    return { title, body: appUpdateCopy.leaveAndUpdateConfirmMember };
  }
  if (options.aloneHost) {
    return { title, body: appUpdateCopy.leaveAndUpdateConfirmHostAlone };
  }
  return { title, body: appUpdateCopy.leaveAndUpdateConfirmHostPromote };
}
