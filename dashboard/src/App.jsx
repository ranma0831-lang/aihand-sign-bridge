import { Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Express from './pages/Express.jsx';
import Learn from './pages/Learn.jsx';
import Challenge from './pages/Challenge.jsx';
import Robots from './pages/Robots.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import Guide from './pages/Guide.jsx';
import Chart from './pages/Chart.jsx';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Express />} />
        <Route path="/express" element={<Express />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/robots" element={<Robots />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/chart" element={<Chart />} />
      </Routes>
    </Shell>
  );
}
