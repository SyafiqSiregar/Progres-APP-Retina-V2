import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Workspace from './components/Workspace';

function App() {
  const [view, setView] = useState('dashboard');
  const [activeProject, setActiveProject] = useState(null);
  const [activeReport, setActiveReport] = useState(null);

  if (view === 'workspace') {
    return (
      <Workspace 
        project={activeProject}
        report={activeReport}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <Dashboard 
      onOpenReport={(project, report) => {
        setActiveProject(project);
        setActiveReport(report);
        setView('workspace');
      }}
    />
  );
}

export default App;
