import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarDays, School } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FunctionTabs } from './ui';

describe('FunctionTabs workflow', () => {
  beforeEach(() => window.history.replaceState(null, '', '#/quan-tri/co-cau-dao-tao'));
  afterEach(cleanup);

  it('explains the current step and supports guided navigation', () => {
    render(<FunctionTabs tabs={[
      { id: 'years', label: 'Năm học', description: 'Tạo và kích hoạt năm học.', Icon: CalendarDays, content: <p>Nội dung năm học</p> },
      { id: 'classes', label: 'Lớp học', description: 'Tạo lớp cho năm học.', Icon: School, content: <p>Nội dung lớp học</p> },
    ]} />);

    expect(screen.getByText('Bước 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Nội dung năm học')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Bước tiếp theo/i }));

    expect(screen.getByText('Bước 2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Nội dung lớp học')).toBeInTheDocument();
    expect(window.location.hash).toContain('tab=classes');
  });
});
