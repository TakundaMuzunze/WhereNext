export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto flex items-center justify-between border-t-2 border-border bg-surface px-6 py-4">
      <p className="text-sm font-medium text-text">
        © {currentYear} Where<span className="text-primary">Next</span>
      </p>

      <p className="text-sm text-muted">Thoughtful recommendations for better trips.</p>
    </footer>
  );
}
