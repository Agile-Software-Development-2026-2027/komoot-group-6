import './Avatar.css';

// Fino a due iniziali, prese dal nome (o username, o email).
function getInitials(name) {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

// Cerchio con le iniziali, in attesa che gli utenti possano caricare una foto.
// size: 'md' (menu) o 'lg' (pagina profilo).
export default function Avatar({ name, size = 'md' }) {
  return (
    <div className={`avatar avatar--${size}`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}
