'use client'

import { tools } from '@unbox-box/tools'
import { ArrowRightIcon, ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { COMMANDS, FLOW, LAYOUT, SOURCES, STACK, WEBMCP_STEPS } from './developer-content'
import { REPO_URL } from '@/lib/site'
import { Section } from './help-parts'

const REPO = REPO_URL.match(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/)?.[0]

export const DEVELOPER_SECTIONS = [
  ['dev-architecture', 'Architecture'],
  ['dev-stack', 'The stack'],
  ['dev-data', 'Data sources'],
  ['dev-webmcp', 'WebMCP'],
  ['dev-tools', 'Tool reference'],
  ['dev-code', 'Code and commands'],
  ['dev-contributing', 'Contributing'],
  ['dev-licences', 'Licences'],
] as const

/** A link into the repository when one is configured, else the plain path. */
function RepoPath({ path }: { path: string }) {
  if (!REPO) return <code className="font-mono text-caption">{path}</code>
  return (
    <a
      href={`${REPO}/blob/main/${path}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-caption underline-offset-4 hover:underline"
    >
      {path}
    </a>
  )
}

function Architecture() {
  return (
    <Section
      id="dev-architecture"
      title="Architecture"
      description="A static site with no server of its own. Everything is plain files."
    >
      <Card>
        <CardContent className="grid gap-4 pt-4 sm:pt-5">
          <ol className="grid gap-3 @min-[900px]:grid-cols-5" aria-label="How data flows">
            {FLOW.map((f, i) => (
              <li
                key={f.step}
                className="relative grid content-start gap-1 rounded-lg bg-surface-2/60 p-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="numeric text-caption text-muted-foreground">{i + 1}</span>
                  {f.step}
                  {i < FLOW.length - 1 && (
                    <ArrowRightIcon
                      className="ml-auto hidden size-3.5 text-faint-foreground @min-[900px]:block"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="text-caption text-muted-foreground">{f.detail}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            One typed tool registry powers every surface: buttons, the plain-English command engine
            and browser agents all call the same functions, so they can&apos;t drift apart.
            Decisions are recorded in <RepoPath path="docs/adr" />.
          </p>
        </CardContent>
      </Card>
    </Section>
  )
}

function Stack() {
  return (
    <Section id="dev-stack" title="The stack" description="What each technology is used for.">
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Layer</TableHead>
              <TableHead>Technology</TableHead>
              <TableHead>Used for</TableHead>
              <TableHead>Licence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {STACK.map((r) => (
              <TableRow key={r.layer} className="align-top">
                <TableCell className="font-medium">{r.layer}</TableCell>
                <TableCell className="min-w-44">{r.tech}</TableCell>
                <TableCell className="min-w-56 whitespace-normal text-muted-foreground">
                  {r.usedFor}
                </TableCell>
                <TableCell className="font-mono text-caption text-muted-foreground">
                  {r.license}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Section>
  )
}

function DataSources() {
  return (
    <Section
      id="dev-data"
      title="Data sources"
      description="Every dataset, what it gives us and its licence."
    >
      <div className="grid gap-3 @min-[900px]:grid-cols-3">
        {SOURCES.map((s) => (
          <Card key={s.name}>
            <CardHeader>
              <div className="grid gap-1">
                <CardTitle>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {s.name}
                  </a>
                </CardTitle>
                <CardDescription>{s.license}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p className="text-muted-foreground">{s.gives}</p>
              <p className="text-caption text-faint-foreground">Code: {s.code}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">
        What we changed in each dataset is listed in{' '}
        <a href="/data/DATA_LICENSE.md" className="underline underline-offset-4">
          DATA_LICENSE.md
        </a>
        . Nothing is scraped from Formula 1&apos;s own sites, and no F1 images are used.
      </p>
    </Section>
  )
}

function WebMcp() {
  return (
    <Section
      id="dev-webmcp"
      title="WebMCP: let your browser's agent drive Unbox Box"
      description="WebMCP is a browser API that lets a site hand its tools to the AI agent built into the browser."
    >
      <Card>
        <CardContent className="grid gap-4 pt-4 sm:pt-5 @min-[900px]:grid-cols-2">
          <ol className="grid list-decimal gap-2 pl-4 text-sm marker:text-faint-foreground">
            {WEBMCP_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="grid content-start gap-2 text-sm">
            <span className="font-medium">How it works in the code</span>
            <p className="text-muted-foreground">
              <RepoPath path="packages/webmcp/src/index.ts" /> is the only file that touches the
              API. It registers each tool with{' '}
              <code className="font-mono text-caption">document.modelContext.registerTool</code> (or{' '}
              <code className="font-mono text-caption">provideContext</code> on older builds) and
              unregisters them when the page closes.
            </p>
            <p className="text-muted-foreground">
              Each tool&apos;s input schema is generated from its Zod schema, and{' '}
              <code className="font-mono text-caption">readOnlyHint</code> tells the agent which
              tools only read. The code loads only when the browser supports WebMCP, so other
              visitors never download it.
            </p>
            <p className="text-muted-foreground">
              Adding a tool: define it with{' '}
              <code className="font-mono text-caption">defineTool</code> in{' '}
              <RepoPath path="packages/tools/src/tools" />, add it to the registry, and it appears
              in the Race Engineer, the command engine and WebMCP at once.
            </p>
            <p className="text-caption text-faint-foreground">
              WebMCP is an early Chrome origin trial (Chrome 149–156); the API may still change.
            </p>
          </div>
        </CardContent>
      </Card>
    </Section>
  )
}

function ToolReference() {
  return (
    <Section
      id="dev-tools"
      title="Tool reference"
      description={`All ${tools.length} tools an agent can call. "Reads" tools only look; "Acts" tools change what's on screen.`}
    >
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>What it does</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((t) => (
              <TableRow key={t.name} className="align-top">
                <TableCell className="font-mono text-caption">{t.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.readOnly ? 'Reads' : 'Acts'}</Badge>
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal text-muted-foreground">
                  {t.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Section>
  )
}

function Code() {
  return (
    <Section id="dev-code" title="Code and commands">
      <div className="grid gap-3 @min-[1000px]:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repository layout</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {LAYOUT.map(([path, what]) => (
                <div key={path} className="grid gap-0.5">
                  <dt>
                    <RepoPath path={path} />
                  </dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              {COMMANDS.map(([cmd, what]) => (
                <div key={cmd} className="grid gap-0.5">
                  <dt>
                    <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-caption">
                      {cmd}
                    </code>
                  </dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function Contributing() {
  return (
    <Section
      id="dev-contributing"
      title="Contributing"
      description="Fixes, features and data corrections are welcome."
    >
      <Card>
        <CardContent className="grid gap-3 pt-4 text-sm sm:pt-5">
          <ol className="grid list-decimal gap-1.5 pl-4 marker:text-faint-foreground">
            <li>
              Open an issue first for anything bigger than a small fix, so we can agree the
              approach.
            </li>
            <li>Fork, branch from main, and keep each pull request to one change.</li>
            <li>
              Run <code className="font-mono text-caption">npm run check</code> and the Playwright
              suite before pushing; CI runs the same.
            </li>
            <li>Use conventional commit messages: feat, fix, refactor, docs, test, chore.</li>
            <li>
              Only add data, code or assets whose licence allows it, and credit them in the Credits
              list; the unit tests fail if a dependency has no credit.
            </li>
          </ol>
          <p className="text-muted-foreground">
            The full guide is <RepoPath path="CONTRIBUTING.md" />. Found a security problem? See{' '}
            <RepoPath path="SECURITY.md" /> and don&apos;t open a public issue.
          </p>
          {REPO && (
            <a
              href={`${REPO}/issues`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-signal-ink underline-offset-4 hover:underline"
            >
              Open issues on GitHub <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>
          )}
        </CardContent>
      </Card>
    </Section>
  )
}

function Licences() {
  return (
    <Section id="dev-licences" title="Licences">
      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm text-muted-foreground sm:pt-5">
          <p>
            Unbox Box&apos;s code is MIT. Data files keep their sources&apos; licences (CC BY 4.0,
            MIT, Apache-2.0). Every dependency, font, flag and service is listed with its licence on
            the{' '}
            <Link href="/credits/" className="text-foreground underline underline-offset-4">
              Credits and licences
            </Link>{' '}
            page, with full texts in{' '}
            <a
              href="/THIRD_PARTY_NOTICES.txt"
              className="text-foreground underline underline-offset-4"
            >
              THIRD_PARTY_NOTICES.txt
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </Section>
  )
}

/** For developers: architecture, the stack, data sources, WebMCP, the tool reference, the
 *  code layout, contributing and licences. */
export function DeveloperGuide() {
  return (
    <>
      <Architecture />
      <Stack />
      <DataSources />
      <WebMcp />
      <ToolReference />
      <Code />
      <Contributing />
      <Licences />
    </>
  )
}
