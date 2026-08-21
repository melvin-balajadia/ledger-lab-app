import { Link } from 'react-router-dom';
import { DemoProjectContext } from '../hooks/useProjectData';
import { Overview } from './Overview';

const DEMO_PROJECT_ID = 1;

export function Demo() {
  return (
    <DemoProjectContext.Provider value={DEMO_PROJECT_ID}>
      <div className="mx-auto flex max-w-295 flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-rule bg-surface-2 px-4 py-3 text-sm">
          <span className="text-ink-muted">
            You're viewing a public demo with sample data — nothing here is real, and no
            changes save.
          </span>
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Sign up to create your own project →
          </Link>
        </div>
        <Overview />
      </div>
    </DemoProjectContext.Provider>
  );
}
