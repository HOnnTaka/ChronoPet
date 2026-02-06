import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Pet from './components/Pet';
import RecordPage from './pages/RecordPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Pet />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
