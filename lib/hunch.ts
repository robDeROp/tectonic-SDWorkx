import type {
  DocumentAssessment,
  HunchCompletion,
  ReviewResult,
} from "./types";

// Search scores describe shared query terms, not a person's expertise or accuracy.
const stopwords = new Set(
  "aan als bij dat de den der deze die dit een en er het hoe hun ik in is je jullie kan met mij mijn moet moeten naar nog of om ons onze ook op over te tot uit van voor wat we welk welke wordt zijn zo beste bedankt groeten alvast tijdens sinds onderzoeken verwerken helpen informatie gegevens nodig vinden maken betreft willen graag kunnen mogen doen hebben heeft had the and for with from this that have how what your".split(
    " ",
  ),
);
export function searchTerms(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .match(/[\p{L}\p{N}]{3,}/gu) || [],
    ),
  ].filter((word) => !stopwords.has(word) && /\p{L}/u.test(word));
}
export function relevanceMatch(question: string, content: string) {
  const terms = searchTerms(question);
  const haystack = new Set(searchTerms(content));
  const matchedTerms = terms.filter((term) => haystack.has(term));
  return {
    score: terms.length
      ? Math.round((matchedTerms.length / terms.length) * 100)
      : 0,
    matchedTerms,
  };
}
export function completionScore(
  assessments: DocumentAssessment[],
  review: ReviewResult,
  closedAt: string,
): HunchCompletion {
  const knowledgeScore = Math.round(
    assessments.reduce((sum, item) => sum + item.score, 0) / assessments.length,
  );
  const reviewScore = review.verdict === "approved" ? 100 : 50;
  return {
    score: Math.round(knowledgeScore * 0.6 + reviewScore * 0.4),
    knowledgeScore,
    reviewScore,
    documentCount: assessments.length,
    closedAt,
  };
}
