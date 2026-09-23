import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NotificationCenter from './NotificationCenter';
import { QueryProvider } from '../providers/QueryProvider';

describe('NotificationCenter Component', () => {
  it('renders notification center panel when open', () => {
    render(
      <QueryProvider>
        <NotificationCenter isOpen={true} onClose={() => {}} />
      </QueryProvider>
    );
    
    const heading = screen.getByRole('heading', { name: /notifications/i });
    expect(heading).toBeDefined();
  });
});
