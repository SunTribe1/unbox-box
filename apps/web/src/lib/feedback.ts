import { z } from 'zod'

// No eval probe under the site's CSP (see packages/tools/src/zod-setup.ts).
z.config({ jitless: true })

/**
 * Bug reports and ideas from the Help page, with no backend of our own.
 *
 * Reports go to Web3Forms (free, 250 a month), which emails them to the address the access
 * key was created for. The key is public by design: it can only send to that inbox.
 *
 *   NEXT_PUBLIC_WEB3FORMS_KEY   the access key from web3forms.com (turns sending on)
 *   NEXT_PUBLIC_REPO_URL        a GitHub repo, for an "Open a GitHub issue" fallback
 */

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit'

export const REPORT_KINDS = [
  { value: 'bug', label: 'Bug', issueLabel: 'bug' },
  { value: 'idea', label: 'Feature idea', issueLabel: 'enhancement' },
  { value: 'data', label: 'Data problem', issueLabel: 'data' },
  { value: 'other', label: 'Other', issueLabel: 'question' },
] as const

export type ReportKind = (typeof REPORT_KINDS)[number]['value']

export const ReportSchema = z.object({
  kind: z.enum(['bug', 'idea', 'data', 'other']),
  page: z.string().trim().min(1).max(40),
  title: z.string().trim().min(4, 'Give it a short title (4+ characters).').max(120),
  details: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (10+ characters).')
    .max(4000, 'Keep it under 4,000 characters.'),
  email: z.union([z.literal(''), z.email('That email doesn’t look right.').max(200)]),
})

export type Report = z.infer<typeof ReportSchema>
export type ReportErrors = Partial<Record<keyof Report, string>>

/** Validates a draft; returns the clean report or the first message per field. */
export function validateReport(
  draft: unknown,
): { ok: true; report: Report } | { ok: false; errors: ReportErrors } {
  const parsed = ReportSchema.safeParse(draft)
  if (parsed.success) return { ok: true, report: parsed.data }
  const errors: ReportErrors = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof Report
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}

const kindLabel = (kind: ReportKind) => REPORT_KINDS.find((k) => k.value === kind)!.label

/** The report as plain text, for copying or an email body. */
export function reportText(r: Report, technical = ''): string {
  return [
    `[${kindLabel(r.kind)}] ${r.title}`,
    '',
    `Page: ${r.page}`,
    '',
    r.details,
    ...(technical ? ['', '---', technical] : []),
  ].join('\n')
}

/** The JSON Web3Forms expects. `botcheck` is its honeypot: real people leave it false. */
export function web3formsPayload(key: string, r: Report, technical = '', honeypot = false) {
  return {
    access_key: key,
    subject: `Unbox Box · ${kindLabel(r.kind)}: ${r.title}`,
    from_name: 'Unbox Box feedback',
    ...(r.email && { email: r.email, replyto: r.email }),
    kind: kindLabel(r.kind),
    page: r.page,
    title: r.title,
    message: r.details,
    ...(technical && { technical }),
    botcheck: honeypot,
  }
}

/** A pre-filled "new issue" link, or null if the repo URL isn't a GitHub repo. */
export function githubIssueUrl(
  repoUrl: string | undefined,
  r: Report,
  technical = '',
): string | null {
  const repo = repoUrl?.match(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/)?.[0]
  if (!repo) return null
  const label = REPORT_KINDS.find((k) => k.value === r.kind)!.issueLabel
  const body = reportText(r, technical).split('\n').slice(2).join('\n')
  const q = new URLSearchParams({ title: r.title, labels: label, body })
  return `${repo}/issues/new?${q}`
}

/** The payload as form fields. A FormData body is a "simple" CORS request (no preflight),
 *  which is what Web3Forms expects from browsers. */
export function web3formsBody(key: string, r: Report, technical = ''): FormData {
  const body = new FormData()
  for (const [k, v] of Object.entries(web3formsPayload(key, r, technical))) {
    // botcheck is a honeypot: Web3Forms rejects the report if it has any value.
    if (k === 'botcheck') continue
    body.append(k, String(v))
  }
  return body
}

/** Sends through Web3Forms; throws with a readable message when it doesn't go through. */
export async function sendReport(
  key: string,
  r: Report,
  technical = '',
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(WEB3FORMS_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: web3formsBody(key, r, technical),
  })
  const result = (await response.json().catch(() => ({}))) as {
    success?: boolean
    message?: string
  }
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `The form service returned ${response.status}.`)
  }
}
