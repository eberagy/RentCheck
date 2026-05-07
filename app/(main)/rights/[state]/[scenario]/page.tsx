import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Scale } from 'lucide-react'
import { US_STATES } from '@/types'
import { getAllScenarios, getScenario } from '@/lib/rights-scenarios'
import { canonicalSiteUrl } from '@/lib/canonical-host'

interface ScenarioPageProps {
  params: { state: string; scenario: string }
}

// Scenario content is statically authored in lib/rights-scenarios; same
// rationale as the parent /rights/[state] page — daily revalidate so an
// edit doesn't require a redeploy to propagate.
export const revalidate = 86400

// Pre-render every scenario × every state (~7 × 51 = 357 pages). The
// scenarios are deliberately generic so they apply to all 50+DC; the
// per-state stylebar comes from the layout, not the body. Aligning with
// /rights/[state]'s full state coverage so a Maryland-renter who lands
// on /rights/wy/security-deposit-not-returned still gets a baked page.
export async function generateStaticParams() {
  return US_STATES.flatMap(s =>
    getAllScenarios().map(scenario => ({ state: s.abbr.toLowerCase(), scenario: scenario.slug }))
  )
}

export async function generateMetadata({ params }: ScenarioPageProps): Promise<Metadata> {
  const p = await params
  const stateInfo = US_STATES.find(s => s.abbr.toLowerCase() === p.state.toLowerCase())
  const scenario = getScenario(p.scenario)
  if (!stateInfo || !scenario) notFound()
  return {
    title: `${scenario.title} — ${stateInfo.name} tenant rights`,
    description: scenario.summary,
    alternates: { canonical: `/rights/${p.state.toLowerCase()}/${p.scenario}` },
  }
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const p = await params
  const stateInfo = US_STATES.find(s => s.abbr.toLowerCase() === p.state.toLowerCase())
  if (!stateInfo) notFound()
  const scenario = getScenario(p.scenario)
  if (!scenario) notFound()

  const siteUrl = canonicalSiteUrl()

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${scenario.title} — ${stateInfo.name}`,
    description: scenario.summary,
    publisher: {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Vett',
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/rights/${p.state.toLowerCase()}/${p.scenario}`,
  }

  // Breadcrumb: Home → Rights → {state} → {scenario}. Mirrors the
  // breadcrumb shape across the rest of the dynamic-route surface.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Tenant Rights', item: `${siteUrl}/rights` },
      { '@type': 'ListItem', position: 3, name: stateInfo.name, item: `${siteUrl}/rights/${p.state.toLowerCase()}` },
      { '@type': 'ListItem', position: 4, name: scenario.title, item: `${siteUrl}/rights/${p.state.toLowerCase()}/${p.scenario}` },
    ],
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(articleJsonLd)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumbJsonLd)}
      </script>

      <article className="mx-auto max-w-[720px] px-7 py-12">
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
          <Link href="/rights" className="hover:text-slate-700">Tenant rights</Link>
          <span className="text-slate-300">›</span>
          <Link href={`/rights/${p.state.toLowerCase()}`} className="hover:text-slate-700">{stateInfo.name}</Link>
          <span className="text-slate-300">›</span>
          <span className="text-slate-700">{scenario.title}</span>
        </nav>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
          <strong>Consumer education, not legal advice.</strong> Tenant law varies by state and even by city.
          If you&apos;re facing an eviction or a large deposit dispute, talk to a lawyer — most states have
          free legal-aid societies for low-income tenants.
        </div>

        <h1 className="mt-6 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.08] tracking-tight text-slate-900">
          {scenario.title}
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">{stateInfo.name} tenant rights</p>
        <p className="mt-4 text-[15.5px] leading-relaxed text-slate-700">{scenario.summary}</p>

        <div className="mt-8 space-y-6">
          {scenario.sections.map((section, idx) => (
            <section key={section.heading}>
              <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-700">
                Step {idx + 1}
              </h2>
              <h3 className="mt-1 font-display text-[20px] leading-tight tracking-tight text-slate-900">
                {section.heading}
              </h3>
              <p className="mt-2 text-[15px] leading-[1.7] text-slate-700">{section.body}</p>
            </section>
          ))}
        </div>

        {scenario.resources.length > 0 && (
          <aside className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              Official + nonprofit resources
            </div>
            <ul className="space-y-1.5">
              {scenario.resources.map(r => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${r.label} (opens in new tab)`}
                    className="inline-flex items-center gap-1 text-[14px] text-teal-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    {r.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-display text-[18px] leading-tight tracking-tight text-slate-900">
            Know the landlord you&apos;re renting from
          </h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
            Search Vett for lease-verified reviews and public records on landlords in {stateInfo.name} before
            you sign anything.
          </p>
          <Link
            href="/search"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-navy-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Search landlords
          </Link>
        </div>

        <Link
          href={`/rights/${p.state.toLowerCase()}`}
          className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to {stateInfo.name} rights
        </Link>
      </article>
    </div>
  )
}
