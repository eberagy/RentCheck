// Shared user-input length caps. Importing from one place prevents the
// client and server from drifting when limits change — previously the
// landlord-response cap lived as a 1000 magic number in both
// app/api/landlord-response/route.ts and app/(main)/landlord-portal/page.tsx
// with no link between them.

/** Max characters a landlord can type in a public reply to a review. */
export const MAX_RESPONSE_LENGTH = 1000
