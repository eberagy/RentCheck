// Plain-language tenant rights scenarios. Deliberately generic — state law
// varies and cities add their own rules, so we ship common-denominator steps
// and point readers to state-specific official resources at the bottom. This
// is consumer education, NOT legal advice, and the page renders that caveat.

export interface RightsScenario {
  slug: string
  title: string
  summary: string
  sections: { heading: string; body: string }[]
  resources: { label: string; href: string }[]
}

const SCENARIOS: RightsScenario[] = [
  {
    slug: 'security-deposit-not-returned',
    title: 'My security deposit wasn\'t returned',
    summary:
      'The steps renters typically take when a landlord fails to return the security deposit within the state\'s statutory deadline, from documentation to small-claims court.',
    sections: [
      {
        heading: 'Check the statutory return deadline',
        body:
          'Most states require landlords to return deposits within 14–60 days of move-out, along with an itemized list of any deductions. Find your state\'s specific deadline on your state attorney general\'s site or HUD\'s tenant rights page (linked below). Mark the deadline on your calendar.',
      },
      {
        heading: 'Send a demand letter',
        body:
          'If the deadline has passed, send a written demand letter (certified mail, return receipt requested) stating the amount owed, the statutory deadline, and a deadline for the landlord to pay before you file in small claims. Keep a copy. This letter is almost always required before you can sue, and it resolves many disputes on its own.',
      },
      {
        heading: 'File in small claims court',
        body:
          'Small claims is designed for these disputes: filing fees are low, lawyers are often not required, and judges are familiar with security-deposit law. Bring your lease, move-in/move-out photos or videos, the itemized deduction list (if any), the demand letter, and the certified-mail receipt. Many states award double or triple the deposit plus attorney\'s fees when landlords withhold deposits in bad faith.',
      },
      {
        heading: 'Document move-in and move-out for the next time',
        body:
          'Going forward: photograph every room on move-in and move-out. Note pre-existing damage in writing, signed by both parties. Get your forwarding address to your landlord in writing. These steps eliminate most deposit disputes before they start.',
      },
    ],
    resources: [
      { label: 'HUD: State tenant/landlord information', href: 'https://www.hud.gov/states' },
      { label: 'Nolo: State-by-state security deposit limits', href: 'https://www.nolo.com/legal-encyclopedia/chart-security-deposit-limits-29045.html' },
      { label: 'National Low Income Housing Coalition', href: 'https://nlihc.org/' },
    ],
  },
  {
    slug: 'landlord-entered-without-notice',
    title: 'My landlord entered without notice',
    summary:
      'What to do when a landlord enters your unit without the notice your state requires — and how to create a paper trail that stops it.',
    sections: [
      {
        heading: 'Know the notice rule for your state',
        body:
          'Most states require 24–48 hours written notice before a landlord can enter for non-emergency reasons (repairs, showings, inspections). Emergencies (flooding, fire, genuine safety issues) are an exception — but "emergency" is narrow, not "whenever I feel like it." Check your lease and state statute for the exact notice window.',
      },
      {
        heading: 'Document the entry in writing',
        body:
          'Send the landlord a dated email or text describing what happened: when they entered, whether you were home, whether they gave notice, and a citation to your state\'s notice requirement. Keep the reply. Email + text both create the timestamped paper trail you\'ll need if this escalates.',
      },
      {
        heading: 'Escalate with a formal written demand',
        body:
          'If it happens again, send a certified letter referencing your earlier complaint and stating that further unannounced entries will be treated as a breach of the implied covenant of quiet enjoyment. For repeat violations, a tenant-rights attorney can pursue damages in many states.',
      },
      {
        heading: 'Consider changing the locks (carefully)',
        body:
          'Some states let tenants change locks and provide the landlord a key; others require landlord permission. Research your state\'s rule before acting — an unauthorized lock change can itself be grounds for eviction depending on where you live.',
      },
    ],
    resources: [
      { label: 'HUD: State tenant/landlord information', href: 'https://www.hud.gov/states' },
      { label: 'Nolo: Landlord\'s right to enter tenant\'s property', href: 'https://www.nolo.com/legal-encyclopedia/landlord-entry-tenant-property-state-laws.html' },
    ],
  },
  {
    slug: 'unsafe-living-conditions',
    title: 'My landlord won\'t fix unsafe conditions',
    summary:
      'How to hold a landlord accountable for habitability failures (mold, heat, pests, plumbing) without jeopardizing your tenancy.',
    sections: [
      {
        heading: 'Submit the repair request in writing',
        body:
          'Every state imposes an "implied warranty of habitability" — the landlord must provide a safe, livable unit. But that duty only triggers once you\'ve given them reasonable notice in writing. Email or text the specific problem with photos, the date you noticed it, and how it\'s affecting the unit. Keep the reply (or lack of one).',
      },
      {
        heading: 'Check your city\'s housing inspection agency',
        body:
          'Most major cities have a housing inspection service that will come out, inspect, and issue formal violations to the landlord — this is the single most effective lever you have. In NYC it\'s HPD; in Chicago it\'s the Department of Buildings; in Philadelphia it\'s L&I; in Boston it\'s ISD. The violation becomes part of the public record and creates legal leverage.',
      },
      {
        heading: 'Consider repair-and-deduct or rent escrow',
        body:
          'In many states, if a landlord refuses to make a required repair after reasonable notice, you may hire someone yourself and deduct the cost from rent, OR pay rent into an escrow account the court holds until the repair is made. Both have strict procedural rules — do NOT just withhold rent without following them. Legal aid can walk you through the exact steps for your state.',
      },
      {
        heading: 'Watch for retaliation',
        body:
          'Most states make it illegal for a landlord to raise your rent, refuse to renew your lease, or evict you in retaliation for making a habitability complaint — often for 6 months after the complaint. If you\'re hit with a retaliatory action, document the timing carefully; it\'s a strong defense and sometimes grounds for damages.',
      },
    ],
    resources: [
      { label: 'HUD: Habitability and repairs', href: 'https://www.hud.gov/topics/rental_assistance/tenantrights' },
      { label: 'NLIHC: State and local tenant-rights resources', href: 'https://nlihc.org/tenant-resources' },
      { label: 'Legal Services Corporation — find legal aid near you', href: 'https://www.lsc.gov/about-lsc/what-legal-aid/find-legal-aid' },
    ],
  },
  {
    slug: 'eviction-notice-received',
    title: 'I just got an eviction notice',
    summary:
      'What to do in the first 72 hours after receiving an eviction notice — your response window is short and how you act matters.',
    sections: [
      {
        heading: 'Identify the notice type',
        body:
          'Eviction notices come in a few flavors: "pay or quit" (you owe rent), "cure or quit" (you\'ve allegedly violated the lease), or "unconditional quit" (most severe, usually for serious breaches). The notice window varies by state and notice type — often 3 to 30 days. The clock starts the day you receive it.',
      },
      {
        heading: 'Do NOT ignore it',
        body:
          'Ignoring the notice does not make it go away. If you miss the window, the landlord files with the court; if you don\'t show up for the court date, you lose by default. Default judgments are much harder to unwind than appearing and negotiating.',
      },
      {
        heading: 'Call legal aid immediately',
        body:
          'Every state has free legal-aid organizations for low-income tenants. Many cities also have "right to counsel" programs in housing court. Call them the day you get the notice. Tenant-side lawyers often win or delay cases landlords expected to win easily, sometimes by spotting procedural defects in the notice itself.',
      },
      {
        heading: 'Know that eviction is a public record',
        body:
          'An eviction filing — even one you ultimately win — shows up in tenant-screening reports for years and can make it harder to rent elsewhere. That\'s all the more reason to contest defective notices early, negotiate a settlement that keeps the case off the record, or move out voluntarily before filing when the writing is on the wall.',
      },
    ],
    resources: [
      { label: 'Legal Services Corporation — find legal aid', href: 'https://www.lsc.gov/about-lsc/what-legal-aid/find-legal-aid' },
      { label: 'HUD: How to get help with eviction', href: 'https://www.hud.gov/topics/rental_assistance/tenantrights' },
      { label: 'Eviction Lab: eviction research by state', href: 'https://evictionlab.org/' },
    ],
  },
  {
    slug: 'landlord-wont-return-contact',
    title: 'My landlord won\'t respond to anything',
    summary:
      'How to force a response from an absentee landlord and protect yourself when they go silent on repairs, deposits, or renewals.',
    sections: [
      {
        heading: 'Put everything in writing, then certify it',
        body:
          'Phone calls and in-person conversations don\'t count. Email creates a timestamped record, but for anything important — deposit demand, major repair, lease question — also send a certified letter with return receipt. Judges treat certified mail as the gold standard for "the tenant gave notice."',
      },
      {
        heading: 'Find the owner of record',
        body:
          'Your property-management company may be the face of the landlord, but the legal owner is often an LLC filed with your state or a property owner listed on the assessor\'s roll. Look up the property on your county assessor\'s website — you\'ll find the legal owner\'s name and a mailing address. Many states also maintain a public landlord registry.',
      },
      {
        heading: 'Use your city housing authority as leverage',
        body:
          'For repair issues: file with your city\'s housing inspection office (HPD / L&I / DOB / ISD). The formal violation is mailed directly to the owner of record, and it often triggers a response within days. The violation also becomes part of the public record that shows up on Vett.',
      },
      {
        heading: 'Escalate via small claims or regulatory complaint',
        body:
          'For deposit or money issues, small claims court is cheap and fast. For licensing issues (e.g., landlord operating without a rental license), your city\'s licensing department can fine the landlord. Both routes force a response from an owner who\'s been ghosting you.',
      },
    ],
    resources: [
      { label: 'HUD: Reporting housing violations', href: 'https://www.hud.gov/topics/housing_discrimination' },
      { label: 'NLIHC: State housing codes and violations', href: 'https://nlihc.org/' },
    ],
  },
]

export function getAllScenarios(): RightsScenario[] {
  return SCENARIOS
}

export function getScenario(slug: string): RightsScenario | undefined {
  return SCENARIOS.find(s => s.slug === slug)
}
