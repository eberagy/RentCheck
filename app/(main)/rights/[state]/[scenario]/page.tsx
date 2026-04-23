import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Scale } from 'lucide-react'
import { US_STATES } from '@/types'
import { getAllScenarios, getScenario } from '@/lib/rights-scenarios'

interface ScenarioPageProps {
  params: { state: string; scenario: string }
}

export async function generateStaticParams() {
  // For now, pre-render the scenarios × the 19 states we actively curate.
  const states = ['md', 'pa', 'sc', 'ny', 'ca', 'il', 'tx', 'wa', 'ma', 'fl', 'ga', 'nc', 'va', 'oh', 'mi', 'co', 'az', 'nv', 'or']
  return states.flatMap(state => getAllScenarios().map(s => ({ state, scenario: s.slug })))
}

export async function generateMetadata({ params }: ScenarioPageProps): Promise<Metadata> {
  const p = await params
  const stateInfo = US_STATES.find(s => s.abbr.toLowerCase() === p.state.toLowerCase())
  const scenario = getScenario(p.scenario)
  if (!stateInfo || !scenario) return { title: 'Not found' }
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vettrentals.com'

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${scenario.title} — ${stateInfo.name}`,
    description: scenario.summary,
    publisher: { '@type': 'Organization', name: 'Vett', url: siteUrl },
    mainEntityOfPage: `${siteUrl}/rights/${p.state.toLowerCase()}/${p.scenario}`,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(articleJsonLd)}
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
              <Scale className="h-3.5 w-3.5" />
              Official + nonprofit resources
            </div>
            <ul className="space-y-1.5">
              {scenario.resources.map(r => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[14px] text-teal-700 hover:underline"
                  >
                    {r.label} <ArrowUpRight className="h-3.5 w-3.5" />
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
          className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {stateInfo.name} rights
        </Link>
      </article>
    </div>
  )
}
