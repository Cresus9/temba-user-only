import React, { Component, ErrorInfo } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
          <div className="max-w-md text-center">
            <WarningCircle className="mx-auto mb-4 h-12 w-12 text-brand" />
            <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Une erreur est survenue</h1>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-ink-2">
              La page n’a pas pu s’afficher. Rechargez-la pour reprendre.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center rounded-[10px] bg-brand px-5 text-[15px] font-semibold text-white"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}