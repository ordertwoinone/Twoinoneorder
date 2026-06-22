// Re-mounts on every navigation, giving each route a subtle mobile-only
// fade-in (see `.page-enter` in globals.css). Opacity-only so it never breaks
// the fixed bottom nav. Desktop is unaffected.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
