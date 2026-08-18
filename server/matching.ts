export type MatchableReport = {
  reportType: "lost" | "found";
  itemKind: "person" | "animal" | "item";
  name: string;
  description: string;
  location: string;
  incidentDate: string;
};

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFKC")
      .split(/[\s.,;:!?()[\]{}"'،؛]+/)
      .map(token => token.trim())
      .filter(token => token.length > 1),
  );
}

function jaccardSimilarity(first: string, second: string): number {
  const firstTokens = tokenize(first);
  const secondTokens = tokenize(second);
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;

  let intersection = 0;
  firstTokens.forEach(token => {
    if (secondTokens.has(token)) intersection += 1;
  });

  let union = firstTokens.size;
  secondTokens.forEach(token => {
    if (!firstTokens.has(token)) union += 1;
  });
  return union === 0 ? 0 : intersection / union;
}

function dateProximity(first: string, second: string): number {
  const firstDate = Date.parse(first);
  const secondDate = Date.parse(second);
  if (Number.isNaN(firstDate) || Number.isNaN(secondDate)) return 0;

  const daysApart = Math.abs(firstDate - secondDate) / 86_400_000;
  if (daysApart <= 1) return 1;
  if (daysApart <= 7) return 0.7;
  if (daysApart <= 30) return 0.35;
  return 0;
}

/**
 * A transparent heuristic for the first matching release. It intentionally
 * prioritizes same item type and then combines name, description, place, and
 * incident-date evidence. It is not an ownership-verification mechanism.
 */
export function calculateMatchScore(
  source: MatchableReport,
  candidate: MatchableReport,
): number {
  if (source.reportType === candidate.reportType) return 0;

  const kindScore = source.itemKind === candidate.itemKind ? 24 : 0;
  const nameScore = jaccardSimilarity(source.name, candidate.name) * 30;
  const descriptionScore = jaccardSimilarity(source.description, candidate.description) * 22;
  const locationScore = jaccardSimilarity(source.location, candidate.location) * 14;
  const dateScore = dateProximity(source.incidentDate, candidate.incidentDate) * 10;

  return Math.max(
    0,
    Math.min(100, Math.round(kindScore + nameScore + descriptionScore + locationScore + dateScore)),
  );
}

export const MATCH_THRESHOLD = 45;
