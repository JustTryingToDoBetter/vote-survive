import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo
  ) {
    console.error(
      "Vote-Survive crashed",
      error,
      info
    );
  }

  private restart = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="landing-page">
        <section className="hero-shell">
          <div className="hero-copy">
            <span className="eyebrow">
              Recovery mode
            </span>

            <h1>
              Something went wrong.
            </h1>

            <p>
              Your game data is still stored on
              the server. Reload the application
              and reconnect to the room.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                onClick={() =>
                  window.location.reload()
                }
              >
                Reload
              </button>

              <button
                className="ghost-btn"
                onClick={this.restart}
              >
                Home
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }
}