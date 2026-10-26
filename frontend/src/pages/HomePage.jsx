import SideMenu from '../components/SideMenu.jsx';

// Homepage: per ora è vuota, c'è solo il menu laterale.
export default function HomePage() {
  return (
    <main>
      <h1 className="visually-hidden">Home</h1>
      <SideMenu />
    </main>
  );
}
