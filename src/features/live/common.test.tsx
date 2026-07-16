import { render, screen } from '@testing-library/react';
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
});
