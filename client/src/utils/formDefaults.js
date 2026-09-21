export function applyLoggedInEmail(currentValue, loggedInEmail) {
  const typedEmail = String(currentValue ?? '').trim();
  if (typedEmail) return typedEmail;
  return String(loggedInEmail ?? '').trim();
}
