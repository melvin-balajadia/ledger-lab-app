import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { postJson } from '../lib/api';
import { Button } from '../components/Button';

export function Setup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await postJson('/api/projects', { name, company });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 rounded-lg border border-rule bg-surface p-7">
        <h1 className="font-display text-2xl font-semibold text-ink">Set up your project</h1>
        <p className="text-sm text-ink-muted">One project per account — you can rename this later.</p>

        {error && <p className="rounded-sm border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Project name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Company</span>
          <input
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-sm border border-rule-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>

        <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-1 justify-center">
          {isSubmitting ? 'Creating…' : 'Create project'}
        </Button>
      </form>
    </div>
  );
}
