import { Link2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function scrollToSection(id: string) {
  const target = document.getElementById(id);
  target?.scrollIntoView({ block: 'start' });
  target?.focus({ preventScroll: true });
}

export function SectionNav({ label, items, className }: { label: string; items: ReadonlyArray<{ title: string; target: string }>; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      {items.map(({ title, target }) => (
        <button key={target} type="button" onClick={() => scrollToSection(target)}>{title}</button>
      ))}
    </nav>
  );
}

export function Overlay({ label, className, onClose, children }: {
  label: string; className: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog ref={dialog} className={className} aria-label={label} onCancel={(event) => {
      event.preventDefault();
      onClose();
    }} onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      {children}
    </dialog>
  );
}

export function CopyWorkLink({ label }: { label: string }) {
  const [status, setStatus] = useState('');
  return (
    <div className="share-link">
      <button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setStatus('Tautan disalin.');
        } catch {
          setStatus('Salin tautan dari bilah alamat browser.');
        }
      }}><Link2 size={16} aria-hidden="true" />{label}</button>
      <span role="status">{status}</span>
    </div>
  );
}

export function ResourceState({ loading, error, retry }: { loading: string; error?: string; retry: () => void }) {
  return (
    <main id="main-content" className="resource-state" tabIndex={-1}>
      {error ? <><p role="alert">{error}</p><button type="button" onClick={retry}>Coba lagi</button></> : <p role="status">{loading}</p>}
    </main>
  );
}

export function ProjectCredit() {
  return <span>Proyek oleh <a href="https://github.com/guspriaman">guspriaman</a> · <a href="https://github.com/guspristack">guspriStack</a></span>;
}
