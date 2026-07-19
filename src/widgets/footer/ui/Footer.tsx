export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto flex items-center justify-between border-t-2 border-primary/20 bg-background px-6 py-4">
      <p className="text-sm font-medium text-text">© {currentYear} WhereNext</p>

      <p className="text-sm text-text/60">Thoughtful recommendations for better trips.</p>
    </footer>
  );
}
