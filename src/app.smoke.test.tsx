import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StoreProvider } from './state/store';
import { App } from './App';
import { buildReportHTML } from './report';
import { buildSeed } from './seed';

describe('app smoke', () => {
  it('renders the shell with seed data without throwing', () => {
    const html = renderToString(
      <StoreProvider>
        <App />
      </StoreProvider>,
    );
    expect(html).toContain('Subjects');
    expect(html).toContain('IFM');
  });

  it('builds a printable report containing key figures', () => {
    const report = buildReportHTML(buildSeed());
    expect(report).toContain('Attendance &amp; Grade-Risk Report');
    expect(report).toContain('IFM');
    expect(report).toContain('Debarred'); // BRM/IMM/Spanish in 2nd term
  });
});
