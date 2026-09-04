import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Logo from '../components/Logo';
import ExpiredLink from '../components/ExpiredLink';
import WarningInterstitial from '../components/WarningInterstitial';
import ReportAbuseModal from '../components/ReportAbuseModal';
import ReportAbuseButton from '../components/ReportAbuseButton';

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

  test('WarningInterstitial component renders with destination URL and hostname', () => {
    const html = renderToString(
      React.createElement(WarningInterstitial, {
        shortCode: 'untrusted123',
        targetUrl: 'https://new-external-domain.com/landing',
        hostname: 'new-external-domain.com',
      })
    );
    expect(html).toContain('new-external-domain.com');
    expect(html).toContain('Peringatan: Tautan Eksternal');
    expect(html).toContain('untrusted123');
  });

  test('ReportAbuseModal component renders when open', () => {
    const html = renderToString(
      React.createElement(ReportAbuseModal, {
        isOpen: true,
        onClose: () => {},
        initialShortCode: 'abc123',
      })
    );
    expect(html).toContain('Laporkan Tautan Bermasalah');
    expect(html).toContain('Phishing');
  });

  test('ReportAbuseModal component returns null/empty when closed', () => {
    const html = renderToString(
      React.createElement(ReportAbuseModal, {
        isOpen: false,
        onClose: () => {},
      })
    );
    expect(html).toBe('');
  });

  test('ReportAbuseButton renders button variant', () => {
    const html = renderToString(React.createElement(ReportAbuseButton, { variant: 'button' }));
    expect(html).toContain('Laporkan Tautan Mencurigakan');
  });

  test('ReportAbuseButton renders header variant', () => {
    const html = renderToString(React.createElement(ReportAbuseButton, { variant: 'header' }));
    expect(html).toContain('Laporkan Tautan');
  });

  test('ReportAbuseButton renders link variant', () => {
    const html = renderToString(React.createElement(ReportAbuseButton, { variant: 'link' }));
    expect(html).toContain('Laporkan Tautan');
  });
});
