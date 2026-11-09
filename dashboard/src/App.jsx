import { Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Express from './pages/Express.jsx';
import Learn from './pages/Learn.jsx';
import Robots from './pages/Robots.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import Guide from './pages/Guide.jsx';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/express" element={<Express />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/robots" element={<Robots />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/guide" element={<Guide />} />
      </Routes>
    </Shell>
  );
}
