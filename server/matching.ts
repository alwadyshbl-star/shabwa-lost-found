export type MatchableReport = {
  reportType: "lost" | "found";
  itemKind: "person" | "animal" | "item";
  name: string;
  description: string;
  location: string;
  incidentDate: string;
};

function normalizeArabic(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "");
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeArabic(value)
      .split(/[\s.,;:!?()[\]{}"'،؛]+/)
      .map(token => token.trim())
      .filter(token => token.length > 1 && !["من", "في", "على", "الى", "عن", "مع", "هذا", "هذه", "كان"].includes(token)),
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
  const tokenScore = union === 0 ? 0 : intersection / union;
  const normalizedFirst = normalizeArabic(first).trim();
  const normalizedSecond = normalizeArabic(second).trim();
  const phraseScore = normalizedFirst.length >= 4 && normalizedSecond.length >= 4 &&
    (normalizedFirst.includes(normalizedSecond) || normalizedSecond.includes(normalizedFirst)) ? 0.82 : 0;
  return Math.max(tokenScore, phraseScore);
}

function dateProximity(first: string, second: string): number {
  const firstDate = Date.parse(first);
  const secondDate = Date.parse(second);
  if (Number.isNaN(firstDate) || Number.isNaN(secondDate)) return 0;

  const daysApart = Math.abs(firstDate - secondDate) / 86_400_000;
  if (daysApart <= 1) return 1;
  if (daysApart <= 3) return 0.85;
  if (daysApart <= 10) return 0.65;
  if (daysApart <= 30) return 0.3;
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
  if (source.reportType === candidate.reportType || source.itemKind !== candidate.itemKind) return 0;

  const nameSimilarity = jaccardSimilarity(source.name, candidate.name);
  const descriptionSimilarity = jaccardSimilarity(source.description, candidate.description);
  if (nameSimilarity === 0 && descriptionSimilarity < 0.12) return 0;

  const kindScore = 25;
  const nameScore = nameSimilarity * 32;
  const descriptionScore = descriptionSimilarity * 20;
  const locationScore = jaccardSimilarity(source.location, candidate.location) * 15;
  const dateScore = dateProximity(source.incidentDate, candidate.incidentDate) * 8;

  return Math.max(
    0,
    Math.min(100, Math.round(kindScore + nameScore + descriptionScore + locationScore + dateScore)),
  );
}

export const MATCH_THRESHOLD = 50;
