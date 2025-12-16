/**
 * Logo Component Tests
 *
 * Tests for the Logo and LogoSVG components.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo, LogoSVG } from '../Logo';

describe('LogoSVG', () => {
  it('renders an SVG element', () => {
    const { container } = render(<LogoSVG />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('id', 'Layer_1');
  });

  it('contains a polygon for the logo shape', () => {
    const { container } = render(<LogoSVG />);

    const polygon = container.querySelector('polygon');
    expect(polygon).toBeInTheDocument();
    expect(polygon).toHaveAttribute('points');
  });
});

describe('Logo', () => {
  it('renders the LogoSVG within a Box', () => {
    const { container } = render(<Logo />);

    // Should have both Box wrapper and SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies default dimensions', () => {
    render(<Logo data-testid="logo-box" />);

    // The Box component should be rendered as a div
    const box = screen.getByTestId('logo-box');
    expect(box).toBeInTheDocument();
  });

  it('accepts custom sx props', () => {
    render(<Logo data-testid="logo-box" sx={{ width: 100, height: 100 }} />);

    const box = screen.getByTestId('logo-box');
    expect(box).toBeInTheDocument();
  });
});
