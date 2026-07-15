type ClerkUserFilterable<T> = {
  ilike(column: string, pattern: string): T;
};

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function forClerkUser<T extends ClerkUserFilterable<T>>(
  query: T,
  userId: string,
): T {
  return query.ilike("clerk_user_id", escapeIlikePattern(userId));
}
