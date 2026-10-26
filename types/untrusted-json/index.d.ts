/** Repository-only trust boundary: JSON needs validation before becoming data. */
interface JSON {
  // A reviver cannot make arbitrary parsed input a validated financial value.
  parse(text: string, reviver?: unknown): unknown;
}

interface Body {
  json(): Promise<unknown>;
}
