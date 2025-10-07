import { ProjectProvider } from './context/ProjectContext';
import { Workspace } from './components/Workspace';

const App = () => (
  <ProjectProvider>
    <Workspace />
  </ProjectProvider>
);

export default App;
