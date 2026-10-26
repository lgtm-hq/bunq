/** Repository-only trust boundary: JSON needs validation before becoming data. */
interface JSON {
  parse(text: string, reviver: (this: unknown, key: string, value: unknown) => unknown): unknown;
  // A reviver cannot make arbitrary parsed input a validated financial value.
  parse(text: string, reviver?: unknown): unknown;
}

interface Body {
  json(): Promise<unknown>;
}

interface ArrayConstructor {
  isArray(arg: unknown): arg is unknown[];
}
