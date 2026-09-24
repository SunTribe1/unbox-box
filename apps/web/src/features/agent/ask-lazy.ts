/** The command engine and tool registry load on the first question, not with the page. */
export function ask(text: string): Promise<void> {
  return import('./ask').then((m) => m.ask(text))
}
