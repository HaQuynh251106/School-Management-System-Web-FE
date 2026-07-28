import { describe, expect, it } from 'vitest';
import { resolveApiBase } from './client';

describe('resolveApiBase', () => {
  it('uses the website hostname for the default local API', () => {
    expect(resolveApiBase(undefined, {
      protocol: 'http:',
      hostname: '127.0.0.1',
    })).toBe('http://127.0.0.1:4000');
  });

  it('normalizes localhost to the loopback hostname used by the website', () => {
    expect(resolveApiBase('http://localhost:4000', {
      protocol: 'http:',
      hostname: '127.0.0.1',
    })).toBe('http://127.0.0.1:4000');
  });

  it('keeps an explicitly configured production API unchanged', () => {
    expect(resolveApiBase('https://api.school.example/', {
      protocol: 'https:',
      hostname: 'school.example',
    })).toBe('https://api.school.example');
  });
});
