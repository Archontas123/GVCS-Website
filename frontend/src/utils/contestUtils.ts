


export const createContestSlug = (contestName: string): string => {
  return contestName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};


export const getContestUrl = (contestName: string, baseUrl: string = window.location.origin): string => {
  const slug = createContestSlug(contestName);
  return `${baseUrl}/contest/${slug}`;
};