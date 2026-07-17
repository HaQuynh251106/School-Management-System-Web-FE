import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Async } from './common';

describe('Async', () => {
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
  });
});
