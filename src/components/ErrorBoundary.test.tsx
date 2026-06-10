import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// Suppress React's console.error for caught errors in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

function ThrowingChild({ message }: { message: string }) {
  throw new Error(message);
}

function GoodChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders Polish fallback heading and message when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="test error" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument();
    expect(
      screen.getByText('Przepraszamy, wystąpił nieoczekiwany błąd.')
    ).toBeInTheDocument();
  });

  it('renders a single reload button labeled "Załaduj ponownie"', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="test error" />
      </ErrorBoundary>
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Załaduj ponownie');
  });

  it('calls window.location.reload when the reload button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild message="test error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Załaduj ponownie'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('shows error message in fallback when DEV is true', () => {
    vi.stubEnv('DEV', true);

    render(
      <ErrorBoundary>
        <ThrowingChild message="Specific dev error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Specific dev error message')).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('does NOT show error message in fallback when DEV is false', () => {
    vi.stubEnv('DEV', false);

    render(
      <ErrorBoundary>
        <ThrowingChild message="Hidden error details" />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Hidden error details')).not.toBeInTheDocument();
    // Fallback heading is still shown
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
