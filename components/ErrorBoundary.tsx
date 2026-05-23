"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  err: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error) {
    console.error("App error:", err);
  }

  reset = () => this.setState({ err: null });

  render() {
    if (this.state.err) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl border border-[var(--tan)] p-6 shadow-sm">
            <div className="text-lg font-semibold text-[var(--charcoal)]">
              Something went wrong
            </div>
            <p className="mt-2 text-sm text-[var(--charcoal-soft)]">
              {this.state.err.message || "Unexpected error."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={this.reset}
                className="px-3 py-2 rounded-md bg-[var(--orange)] text-white text-sm font-medium"
              >
                Recover
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 rounded-md border border-[var(--tan)] text-sm"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
