import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Calendar, CheckCircle2, ClipboardList, Clock, Mail, Plus, Trash2, Users,
} from 'lucide-react';
import { standupApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { StandupDecision, StandupSessionData } from '../types';

interface DailyStandupTabProps {
  projectId: number;
  teamNames: string[];
}

function TaskList({ items, empty }: { items: StandupSessionData['agenda']['dueToday']; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
          <span className="flex-1 font-medium">{t.title}</span>
          <span className="text-xs text-gray-500">{t.assignee_name || 'Unassigned'}</span>
        </li>
      ))}
    </ul>
  );
}

export function DailyStandupTab({ projectId, teamNames }: DailyStandupTabProps) {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<StandupSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [decisionForm, setDecisionForm] = useState({ decision: '', action: '', owner_name: '', due_date: '', category: 'general' });
  const [parkingText, setParkingText] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    standupApi.getSession(projectId, date).then((d) => {
      setData(d);
      setNotes(d.session.notes || '');
      try {
        setAttendees(JSON.parse(d.session.attendees || '[]'));
      } catch {
        setAttendees([]);
      }
    }).finally(() => setLoading(false));
  }, [projectId, date]);

  useEffect(() => { load(); }, [load]);

  const saveSession = async () => {
    if (!data) return;
    setSaving(true);
    await standupApi.updateSession(projectId, data.session.id, { notes, attendees });
    setSaving(false);
    load();
  };

  const addDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !decisionForm.decision.trim() || !decisionForm.owner_name.trim()) return;
    await standupApi.addDecision(projectId, data.session.id, decisionForm);
    setDecisionForm({ decision: '', action: '', owner_name: '', due_date: '', category: 'general' });
    load();
  };

  const addParking = async () => {
    if (!data || !parkingText.trim()) return;
    await standupApi.addParking(projectId, data.session.id, parkingText.trim());
    setParkingText('');
    load();
  };

  const openEmailDraft = async () => {
    const draft = await standupApi.getEmailDraft(projectId, date);
    window.location.href = draft.mailto;
  };

  if (loading) return <div className="text-gray-500">Loading standup...</div>;
  if (!data) return <div className="text-red-500">Could not load standup</div>;

  const { agenda, decisions, parking } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-brand-600" />
          <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <span className="text-sm text-gray-500">Daily standup for {data.projectName}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={openEmailDraft} className="btn-secondary text-sm">
            <Mail className="h-4 w-4" /> Email draft
          </button>
          <button type="button" onClick={saveSession} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving...' : 'Save session'}
          </button>
        </div>
      </div>

      {/* Agenda grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Done since {agenda.sinceDate}
          </h3>
          <TaskList items={agenda.doneSinceLastStandup} empty="No completions recorded since last standup" />
        </section>

        <section className="card border-l-4 border-l-blue-500">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-blue-500" /> Due today ({agenda.dueToday.length})
          </h3>
          <TaskList items={agenda.dueToday} empty="Nothing due today — confirm priorities in notes" />
        </section>

        <section className="card border-l-4 border-l-red-500">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertTriangle className="h-4 w-4" /> Overdue ({agenda.overdue.length})
          </h3>
          <TaskList items={agenda.overdue} empty="No overdue tasks" />
        </section>

        <section className="card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4" /> In progress ({agenda.inProgress.length})
          </h3>
          <TaskList items={agenda.inProgress} empty="No active WIP tasks" />
        </section>

        <section className="card border-l-4 border-l-orange-500 md:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-600">
            <AlertTriangle className="h-4 w-4" /> Blocked ({agenda.blocked.length})
          </h3>
          <TaskList items={agenda.blocked} empty="No blockers" />
        </section>
      </div>

      {/* People round */}
      {agenda.peopleRound.length > 0 && (
        <section className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" /> People round
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Person</th>
                  <th className="pb-2 pr-4">Today</th>
                  <th className="pb-2">In progress</th>
                </tr>
              </thead>
              <tbody>
                {agenda.peopleRound.map((row) => (
                  <tr key={row.name} className="border-b dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium">{row.name}</td>
                    <td className="py-2 pr-4 text-gray-600">{row.today.map((t) => t.title).join(', ') || '—'}</td>
                    <td className="py-2 text-gray-600">{row.inProgress.map((t) => t.title).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Decisions */}
      <section className="card">
        <h3 className="mb-3 font-semibold">Decisions & actions</h3>
        {decisions.length > 0 && (
          <ul className="mb-4 space-y-2">
            {decisions.map((d: StandupDecision) => (
              <li key={d.id} className="flex items-start justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm dark:bg-brand-900/20">
                <div>
                  <p className="font-medium">{d.decision}</p>
                  <p className="text-xs text-gray-500">Action: {d.action || '—'} · Owner: {d.owner_name} · Due: {d.due_date || '—'}</p>
                </div>
                <button type="button" onClick={() => standupApi.deleteDecision(projectId, d.id).then(load)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addDecision} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="Decision *" required value={decisionForm.decision} onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })} />
          <input className="input" placeholder="Action item" value={decisionForm.action} onChange={(e) => setDecisionForm({ ...decisionForm, action: e.target.value })} />
          <input className="input" placeholder="Owner *" required value={decisionForm.owner_name} onChange={(e) => setDecisionForm({ ...decisionForm, owner_name: e.target.value })} />
          <input className="input" type="date" value={decisionForm.due_date} onChange={(e) => setDecisionForm({ ...decisionForm, due_date: e.target.value })} />
          <select className="input" value={decisionForm.category} onChange={(e) => setDecisionForm({ ...decisionForm, category: e.target.value })}>
            <option value="general">General</option>
            <option value="scope">Scope</option>
            <option value="resource">Resource</option>
            <option value="timeline">Timeline</option>
            <option value="technical">Technical</option>
            <option value="client">Client</option>
          </select>
          <button type="submit" className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add decision</button>
        </form>
      </section>

      {/* Parking lot */}
      <section className="card">
        <h3 className="mb-3 font-semibold">Parking lot</h3>
        <div className="mb-2 flex gap-2">
          <input className="input flex-1" placeholder="Defer to later..." value={parkingText} onChange={(e) => setParkingText(e.target.value)} />
          <button type="button" onClick={addParking} className="btn-secondary">Add</button>
        </div>
        <ul className="space-y-1 text-sm">
          {parking.filter((p) => !p.resolved).map((p) => (
            <li key={p.id} className="flex justify-between rounded bg-gray-50 px-2 py-1 dark:bg-gray-800">
              <span>{p.text}</span>
              <button type="button" className="text-xs text-brand-600" onClick={() => standupApi.resolveParking(projectId, p.id, true).then(load)}>Resolve</button>
            </li>
          ))}
        </ul>
      </section>

      {/* Notes & attendees */}
      <section className="card">
        <h3 className="mb-3 font-semibold">Standup notes</h3>
        <div className="mb-3">
          <label className="label">Attendees</label>
          <div className="flex flex-wrap gap-2">
            {teamNames.map((name) => (
              <label key={name} className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs">
                <input type="checkbox" checked={attendees.includes(name)} onChange={(e) => {
                  setAttendees(e.target.checked ? [...attendees, name] : attendees.filter((a) => a !== name));
                }} />
                {name}
              </label>
            ))}
          </div>
        </div>
        <textarea className="input min-h-[100px]" placeholder="Notes from today's call..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        <p className="mt-2 text-xs text-gray-400">Facilitator: {user?.name}</p>
      </section>

      {/* History */}
      {data.history.length > 1 && (
        <section className="card">
          <h3 className="mb-2 font-semibold">Recent standups</h3>
          <div className="flex flex-wrap gap-2">
            {data.history.map((s) => (
              <button key={s.id} type="button" onClick={() => setDate(s.session_date)}
                className={`rounded-full px-3 py-1 text-xs ${s.session_date === date ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {s.session_date}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
