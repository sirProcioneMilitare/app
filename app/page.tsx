const PAGES = [
  { href: "/test/auth", label: "Auth" },
  { href: "/test/bookings", label: "Prenotazioni" },
  { href: "/test/sos", label: "SOS" },
  { href: "/test/availability", label: "Disponibilità" },
  { href: "/test/daily", label: "Contenuti quotidiani" },
  { href: "/test/rewards", label: "Buoni" },
  { href: "/test/mood", label: "Umore" },
  { href: "/test/push", label: "Push" },
];

export default function Home() {
  return (
    <main>
      <h1>SOS Burnout — pagine di prova</h1>
      <p>
        Queste pagine servono solo a verificare che le API rispondano. Nessuno
        styling, per design.
      </p>
      <ul>
        {PAGES.map((p) => (
          <li key={p.href}>
            <a href={p.href}>{p.label}</a>
          </li>
        ))}
      </ul>
      <p>Vedi anche API_CONTRACT.md nel repository.</p>
    </main>
  );
}
