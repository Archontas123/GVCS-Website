/**
 * Contest utility functions
 */

/**
 * Creates a URL-friendly slug from a contest name
 */
export const createContestSlug = (contestName: string): string => {
  return contestName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generates the full contest URL using the contest name slug
 */
export const getContestUrl = (contestName: string, baseUrl: string = window.location.origin): string => {
  const slug = createContestSlug(contestName);
  return `${baseUrl}/contest/${slug}`;
};