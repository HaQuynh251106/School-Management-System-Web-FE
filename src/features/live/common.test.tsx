import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Async } from './common';

describe('Async', () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.history.replaceState(null, '', '#/test');
  });

  it('renders children for an empty collection when empty data is a valid state', () => {
    render(
      <Async state={{ data: [], loading: false, error: null }} allowEmpty>
        {() => <div>Empty timetable grid</div>}
      </Async>,
    );

    expect(screen.getByText('Empty timetable grid')).toBeInTheDocument();
  });

  it('paginates array data with the shared controls', () => {
    const rows = Array.from({ length: 12 }, (_, index) => `Dòng ${index + 1}`);
    render(
      <Async state={{ data: rows, loading: false, error: null }} paginate pageSize={5} itemLabel="học sinh">
        {(items) => <div>{items.map((item) => <span key={item}>{item}</span>)}</div>}
      </Async>,
    );

    expect(screen.getByText('Dòng 1')).toBeInTheDocument();
    expect(screen.queryByText('Dòng 6')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('Dòng 6')).toBeInTheDocument();
    expect(screen.getByText(/6–10/)).toBeInTheDocument();
    expect(window.location.hash).toContain('p_hoc_sinh=2');
  });

  it('restores pagination from the URL and reacts to browser navigation', () => {
    window.history.replaceState(null, '', '#/test?p_hoc_sinh=2&s_hoc_sinh=5');
    const rows = Array.from({ length: 12 }, (_, index) => `Dòng ${index + 1}`);
    render(
      <Async state={{ data: rows, loading: false, error: null }} paginate pageSize={5} itemLabel="học sinh">
        {(items) => <div>{items.map((item) => <span key={item}>{item}</span>)}</div>}
      </Async>,
    );

    expect(screen.getByText('Dòng 6')).toBeInTheDocument();
    window.history.pushState(null, '', '#/test?p_hoc_sinh=3&s_hoc_sinh=5');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByText('Dòng 11')).toBeInTheDocument();
  });
});
