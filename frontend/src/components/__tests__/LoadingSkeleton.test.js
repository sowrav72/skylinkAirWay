import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSkeleton from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders with default styling', () => {
    render(<LoadingSkeleton />);

    const skeleton = document.querySelector('.loading-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('loading-skeleton');
  });

  it('applies custom className', () => {
    render(<LoadingSkeleton className="custom-skeleton" />);

    const skeleton = document.querySelector('.loading-skeleton');
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('renders different variants correctly', () => {
    render(<LoadingSkeleton variant="card" />);

    const skeleton = document.querySelector('.loading-skeleton');
    expect(skeleton).toHaveStyle({ height: '200px', borderRadius: '12px' });
  });

  it('renders text variant', () => {
    render(<LoadingSkeleton variant="text" />);

    const skeleton = document.querySelector('.loading-skeleton');
    expect(skeleton).toHaveStyle({ height: '1rem', borderRadius: '4px' });
  });

  it('applies custom style', () => {
    const customStyle = { width: '300px', backgroundColor: 'red' };
    render(<LoadingSkeleton style={customStyle} />);

    const skeleton = document.querySelector('.loading-skeleton');
    expect(skeleton).toHaveStyle(customStyle);
  });
});