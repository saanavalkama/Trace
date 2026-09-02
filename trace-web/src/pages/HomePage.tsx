import { Link } from 'react-router-dom'

const features = [
  {
    title: 'Sprint boards',
    description: 'Plan work into sprints and track it column by column, from backlog to done.',
  },
  {
    title: 'Full issue activity',
    description: 'Every status change, comment, and reassignment is recorded in a single timeline.',
  },
  {
    title: 'Point-in-time snapshots',
    description: 'Roll back and compare how an issue or board looked at any moment in time.',
  },
  {
    title: 'Invite-only workspaces',
    description: 'Bring your team in over email. No public sign-up, no noise.',
  },
]

export default function HomePage() {
  return (
    <>
      <nav className="flex items-center justify-between border-b border-border px-8 py-5 max-lg:px-5">
        <span className="text-lg font-semibold tracking-tight text-text-h">Trace</span>
        <Link
          to="/login"
          className="rounded-md border border-border px-4 py-2 text-[15px] font-medium text-text-h transition hover:border-accent-border hover:shadow-brand"
        >
          Log in
        </Link>
      </nav>

      <section className="flex flex-grow flex-col items-center gap-5 px-8 pt-24 pb-18 text-center max-lg:gap-4 max-lg:px-5 max-lg:pt-14 max-lg:pb-12">
        <span className="rounded-full border border-accent-border bg-accent-bg px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
          Now in early access
        </span>
        <h1 className="max-w-[720px] text-[56px] leading-[1.15] tracking-[-1.68px] text-text-h max-lg:text-4xl">
          Track your team&rsquo;s work without losing the thread
        </h1>
        <p className="max-w-[560px] text-lg">
          Trace keeps issues, sprints, and activity in one place, so your team always knows
          what changed, when, and why.
        </p>
        <div className="mt-2 flex gap-3 max-lg:w-full max-lg:max-w-[280px] max-lg:flex-col">
          <Link
            to="/login"
            className="rounded-md border border-accent-border bg-accent-bg px-5 py-2.5 text-base font-medium text-brand transition hover:shadow-brand"
          >
            Get started
          </Link>
          <a
            href="#features"
            className="rounded-md border border-border px-5 py-2.5 text-base font-medium text-text-h transition hover:border-accent-border"
          >
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="grid grid-cols-2 gap-4 border-t border-border p-8 lg:grid-cols-4 max-lg:p-5">
        {features.map((feature) => (
          <div className="rounded-lg border border-border p-6 text-left" key={feature.title}>
            <h3 className="mb-2 text-base font-semibold text-text-h">{feature.title}</h3>
            <p className="text-[15px] leading-[145%]">{feature.description}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-border px-8 py-6 text-sm max-lg:px-5">
        <p>&copy; {new Date().getFullYear()} Trace. All rights reserved.</p>
      </footer>
    </>
  )
}
