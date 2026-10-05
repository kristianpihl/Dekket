import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ActivityFeed from '../components/ActivityFeed'
import AnnouncedChanges from '../components/AnnouncedChanges'
import AreaGrid from '../components/AreaGrid'
import CostOverview from '../components/CostOverview'
import CoverageSummary from '../components/CoverageSummary'
import HolderBreakdown from '../components/HolderBreakdown'
import RenewalList from '../components/RenewalList'
import TodoList from '../components/TodoList'
import {
  announcedChanges,
  attentionCount,
  buildAreas,
  buildTodos,
  costSummary,
  holderBreakdown,
  upcomingRenewals,
} from '../lib/overview'
import { usePolicies } from '../lib/usePolicies'
import { usePolicyEvents } from '../lib/usePolicyEvents'

// The overview page. Everything here is calculated from the user's own policies
// (see lib/overview.js) — there is no example data any more.
export default function Dashboard() {
  const { policies, loading, error } = usePolicies()
  const activity = usePolicyEvents(8)

  const view = useMemo(() => {
    const today = new Date()
    return {
      areas: buildAreas(policies, today),
      todos: buildTodos(policies, today),
      renewals: upcomingRenewals(policies, today),
      cost: costSummary(policies, today),
      holders: holderBreakdown(policies, today),
      attention: attentionCount(policies, today),
      changes: announcedChanges(policies, today).upcoming,
    }
  }, [policies])

  const hasPolicies = policies.length > 0

  return (
    <div className="dash">
      <section className="dash-hero">
        <h1>Slik står det til med forsikringene dine</h1>
        <p className="dash-sub">
          {loading
            ? 'Henter forsikringene dine …'
            : hasPolicies
              ? `Du har lagt til ${policies.length} ${policies.length === 1 ? 'forsikring' : 'forsikringer'}. ${
                  view.attention === 0 ? 'Ingenting haster akkurat nå.' : `${view.attention} ${view.attention === 1 ? 'område' : 'områder'} bør følges opp.`
                }`
              : 'Legg til forsikringene dine, så får du oversikten her.'}
        </p>
        <Link to="/legg-til" className="cta">
          <i className="bi bi-plus-lg me-2" aria-hidden="true" />
          Legg til forsikring
        </Link>
      </section>

      {error && <div className="alert alert-warning mb-0">{error}</div>}

      <CoverageSummary areas={view.areas} policyCount={policies.length} attention={view.attention} />

      {view.todos.length > 0 && (
        <section>
          <h2 className="section-title">Må følges opp</h2>
          <TodoList todos={view.todos} />
        </section>
      )}

      {view.changes.length > 0 && (
        <section className="card-box">
          <h2 className="section-title">Endringer på vei</h2>
          <AnnouncedChanges changes={view.changes} />
        </section>
      )}

      <section>
        <h2 className="section-title">Dine områder</h2>
        <AreaGrid areas={view.areas} />
      </section>

      {hasPolicies && (
        <div className="dash-cols">
          <section className="card-box">
            <h2 className="section-title">Fornyelser</h2>
            <RenewalList renewals={view.renewals} />
          </section>
          <section className="card-box">
            <h2 className="section-title">Kostnad</h2>
            <CostOverview cost={view.cost} />
          </section>
        </div>
      )}

      <div className="dash-cols">
        {hasPolicies && (
          <section className="card-box">
            <h2 className="section-title">Hvem har tegnet</h2>
            <HolderBreakdown rows={view.holders} />
          </section>
        )}
        <section className="card-box">
          <h2 className="section-title">Siste aktivitet</h2>
          <ActivityFeed events={activity.events} failed={activity.error} />
        </section>
      </div>
    </div>
  )
}
