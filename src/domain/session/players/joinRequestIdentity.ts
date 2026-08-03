export function buildJoinRequestIdentityLabel(input: {
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const username = input.username?.trim();
  if (username) {
    return username;
  }

  const email = input.email?.trim();
  if (email) {
    return email;
  }

  return "Anonymous player";
}
