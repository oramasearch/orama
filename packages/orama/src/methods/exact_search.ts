// When exact: true is requested, bypass language stemmer stripping to match literal string
export async function resolveSearchTokens(o: any, term: string, exact?: boolean): Promise<string[]> {
  if (exact) {
    return [term.trim()];
  }
  return await o.tokenizer.tokenize(term, o.tokenizer.language);
}
