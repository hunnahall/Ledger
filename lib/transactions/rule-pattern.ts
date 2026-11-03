// A rule's pattern is a phrase, or phrases joined with AND, OR and NOT
// (typed in capitals, so a merchant like "barnes and noble" stays one
// phrase), grouped with parentheses. Each phrase only has to appear
// somewhere in the transaction's normalized description, and * inside a
// phrase stands for any run of characters ("amzn*mktp").
//
// The pattern is stored in canonical form in rules.merchant_normalized:
// phrases normalized like normalizeMerchant, operators in capitals. A plain
// phrase stays exactly what normalizeMerchant gives, so older rules read
// the same. Anything more than a plain phrase is also compiled to one
// regular expression (rules.match_regex) built from lookaheads, which
// JavaScript and Postgres both evaluate the same way, so apply_rules and
// findMatchingRule agree.

type Node =
  | { kind: "term"; text: string }
  | { kind: "not"; child: Node }
  | { kind: "and" | "or"; children: Node[] };

type Token = { kind: "word"; text: string } | { kind: "op"; text: "AND" | "OR" | "NOT" | "(" | ")" };

function normalizeTerm(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9*\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !/^\d+$/.test(token))
    .join(" ")
    .replace(/\*+/g, "*")
    .trim();
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  for (const raw of input.split(/(\(|\))|\s+/)) {
    if (!raw) continue;
    if (raw === "(" || raw === ")" || raw === "AND" || raw === "OR" || raw === "NOT") {
      tokens.push({ kind: "op", text: raw });
    } else {
      tokens.push({ kind: "word", text: raw });
    }
  }
  return tokens;
}

class ParseError extends Error {}

// or  := and (OR and)*
// and := not ((AND)? not)*   a phrase followed by NOT or "(" means AND
// not := NOT not | ( or ) | phrase
function parse(tokens: Token[]): Node {
  let i = 0;
  const peek = () => tokens[i];

  function parseOr(): Node {
    const children = [parseAnd()];
    while (peek()?.kind === "op" && peek()!.text === "OR") {
      i++;
      children.push(parseAnd());
    }
    return children.length === 1 ? children[0] : { kind: "or", children };
  }

  function parseAnd(): Node {
    const children = [parseNot()];
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && t.text === "AND") {
        i++;
        children.push(parseNot());
      } else if (t && (t.kind === "word" || t.text === "NOT" || t.text === "(")) {
        children.push(parseNot());
      } else break;
    }
    return children.length === 1 ? children[0] : { kind: "and", children };
  }

  function parseNot(): Node {
    const t = peek();
    if (!t) throw new ParseError();
    if (t.kind === "op" && t.text === "NOT") {
      i++;
      return { kind: "not", child: parseNot() };
    }
    if (t.kind === "op" && t.text === "(") {
      i++;
      const inner = parseOr();
      if (peek()?.text !== ")") throw new ParseError();
      i++;
      return inner;
    }
    if (t.kind === "word") {
      const words: string[] = [];
      while (peek()?.kind === "word") words.push(tokens[i++].text);
      const text = normalizeTerm(words.join(" "));
      if (!text) throw new ParseError();
      return { kind: "term", text };
    }
    throw new ParseError();
  }

  const node = parseOr();
  if (i !== tokens.length) throw new ParseError();
  return node;
}

function print(node: Node, parent: "or" | "and" | "not" | null = null): string {
  switch (node.kind) {
    case "term":
      return node.text;
    case "not":
      return `NOT ${print(node.child, "not")}`;
    case "and": {
      const s = node.children.map((c) => print(c, "and")).join(" AND ");
      return parent === "not" ? `(${s})` : s;
    }
    case "or": {
      const s = node.children.map((c) => print(c, "or")).join(" OR ");
      return parent === "and" || parent === "not" ? `(${s})` : s;
    }
  }
}

// Every node becomes a zero-width check at the start of the description:
// a phrase is "(?=.*phrase)", AND puts checks side by side, OR is an
// alternation and NOT a negative lookahead. Phrases only hold a-z, 0-9,
// spaces and *, so nothing needs escaping.
function compile(node: Node): string {
  switch (node.kind) {
    case "term":
      return `(?=.*${node.text.replace(/\*/g, ".*")})`;
    case "not":
      return `(?!${compile(node.child)})`;
    case "and":
      return node.children.map(compile).join("");
    case "or":
      return `(?:${node.children.map(compile).join("|")})`;
  }
}

export type RulePattern = { pattern: string; regex: string | null };

export function parseRulePattern(input: string): RulePattern | { error: string } {
  let node: Node;
  try {
    node = parse(tokenize(input.trim()));
  } catch {
    return { error: "Check the pattern: each AND, OR and NOT needs a phrase on both sides, and parentheses must pair up." };
  }

  const pattern = print(node);
  if (node.kind === "term" && !node.text.includes("*")) return { pattern, regex: null };

  const regex = `^${compile(node)}`;
  // A pattern that an empty description satisfies ("NOT amazon", "*")
  // would claim nearly every transaction.
  if (new RegExp(regex).test("")) {
    return { error: "A rule needs at least one phrase the description must contain." };
  }
  return { pattern, regex };
}

const compiled = new Map<string, RegExp | null>();

// Matches a stored (canonical) pattern against a normalized description.
export function rulePatternMatches(pattern: string, merchantNormalized: string): boolean {
  if (!pattern) return false;
  let re = compiled.get(pattern);
  if (re === undefined) {
    const parsed = parseRulePattern(pattern);
    re = "error" in parsed || parsed.regex === null ? null : new RegExp(parsed.regex);
    compiled.set(pattern, re);
  }
  return re ? re.test(merchantNormalized) : merchantNormalized.includes(pattern);
}
