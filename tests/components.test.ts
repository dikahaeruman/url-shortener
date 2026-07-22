import { describe, expect, test } from 'bun:test';
import Logo from '../components/Logo';
import ExpiredLink from '../components/ExpiredLink';

describe('UI Component Tests', () => {
  test('Logo component renders JSX element with size sm', () => {
    const element = Logo({ size: 'sm' });
    expect(element).toBeTruthy();
    expect(element.type).toBe('div');
  });

  test('Logo component renders JSX element with size md', () => {
    const element = Logo({ size: 'md' });
    expect(element).toBeTruthy();
    expect(element.type).toBe('div');
  });

  test('Logo component renders JSX element with size lg', () => {
    const element = Logo({ size: 'lg' });
    expect(element).toBeTruthy();
    expect(element.type).toBe('div');
  });

  test('ExpiredLink component renders shortCode message JSX element', () => {
    const element = ExpiredLink({ shortCode: 'test12' });
    expect(element).toBeTruthy();
    expect(element.type).toBe('div');
  });
});
