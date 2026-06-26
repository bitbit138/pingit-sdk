import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('renders the label and value', () => {
    render(<KpiCard label="Pass rate" value="78%" />);
    expect(screen.getByText('Pass rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders an optional hint', () => {
    render(<KpiCard label="Avg latency" value="46 ms" hint="last 7 days" />);
    expect(screen.getByText('last 7 days')).toBeInTheDocument();
  });
});
