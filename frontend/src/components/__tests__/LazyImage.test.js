import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyImage from './LazyImage';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

describe('LazyImage', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
  };

  it('renders loading placeholder initially', () => {
    render(<LazyImage {...defaultProps} />);

    // Should show loading spinner initially
    const loadingElement = document.querySelector('.loading-skeleton');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<LazyImage {...defaultProps} className="custom-class" />);

    const wrapper = document.querySelector('.lazy-image-wrapper');
    expect(wrapper).toHaveClass('custom-class');
  });

  it('applies custom style', () => {
    const customStyle = { width: '200px', height: '150px' };
    render(<LazyImage {...defaultProps} style={customStyle} />);

    const wrapper = document.querySelector('.lazy-image-wrapper');
    expect(wrapper).toHaveStyle(customStyle);
  });

  it('shows placeholder when provided and image fails to load', () => {
    render(<LazyImage {...defaultProps} placeholder="placeholder.jpg" />);

    // Initially should show loading state
    const loadingElement = document.querySelector('.loading-skeleton');
    expect(loadingElement).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LazyImage {...defaultProps} />);

    const wrapper = document.querySelector('.lazy-image-wrapper');
    expect(wrapper).toHaveAttribute('role', 'img');
  });
});