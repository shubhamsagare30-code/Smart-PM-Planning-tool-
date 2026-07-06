import { useEffect, useState } from 'react';
import { skillMatrixApi } from '../api';
import { SearchInput } from '../components/SearchInput';
import { Badge } from '../components/Badge';
import type { SkillMatrixEntry } from '../types';

export function SkillMatrixPage() {
  const [entries, setEntries] = useState<SkillMatrixEntry[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      skillMatrixApi.get(skillSearch || undefined, roleSearch || undefined)
        .then(setEntries)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [skillSearch, roleSearch]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Skill Matrix</h1>
        <p className="text-gray-500 dark:text-gray-400">Skills mapped to available resources</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-64"><SearchInput value={skillSearch} onChange={setSkillSearch} placeholder="Search by skill..." /></div>
        <div className="w-64"><SearchInput value={roleSearch} onChange={setRoleSearch} placeholder="Search by role..." /></div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading skill matrix...</div>
      ) : entries.length === 0 ? (
        <div className="card text-gray-500">No skills match your search criteria.</div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.skill} className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{entry.skill}</h3>
                <Badge variant="info">{entry.resources.length} resources</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {entry.resources.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-gray-500">{r.designation} · {r.department}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Available</span>
                        <span className={r.available > 30 ? 'text-green-600' : r.available > 0 ? 'text-yellow-600' : 'text-red-600'}>
                          {r.available}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-2 rounded-full ${r.available > 30 ? 'bg-green-500' : r.available > 0 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(r.available, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
