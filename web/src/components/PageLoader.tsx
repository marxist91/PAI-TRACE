import { Component, Suspense, type ReactNode } from 'react';

class PageLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="ops-panel p-6" role="alert">
          <h2>La page n’a pas pu être chargée</h2>
          <p>Vérifiez votre connexion. Si une mise à jour vient d’être publiée, rechargez l’application.</p>
          <button className="ops-button" onClick={() => window.location.reload()}>Recharger l’application</button>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function PageLoader({ children }: { children: ReactNode }) {
  return (
    <PageLoadBoundary>
      <Suspense fallback={<div className="p-6" role="status" aria-live="polite">Chargement de la page…</div>}>
        {children}
      </Suspense>
    </PageLoadBoundary>
  );
}
