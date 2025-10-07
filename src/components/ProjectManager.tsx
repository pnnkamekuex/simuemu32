import { FormEvent, useMemo, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import type { ProjectTemplate } from '../types';

const templateOptions: { value: ProjectTemplate; label: string; description: string }[] = [
  {
    value: 'normal',
    label: 'Normal',
    description: 'Estructura clásica con secciones .data y .text',
  },
  {
    value: 'simplificado',
    label: 'Simplificado',
    description: 'Solo punto de entrada y retorno',
  },
];

export const ProjectManager = () => {
  const { projects, currentProject, createProject, loadProject } = useProjectContext();
  const [name, setName] = useState('Proyecto demo');
  const [template, setTemplate] = useState<ProjectTemplate>('normal');

  const hasProjects = projects.length > 0;

  const recentProjects = useMemo(() => projects.slice(0, 5), [projects]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    createProject(name.trim(), template);
    setName('');
  };

  return (
    <div className="panel">
      <header>
        <h2 className="panelTitle">Proyectos</h2>
      </header>
      <form onSubmit={handleSubmit} className="projectForm">
        <div className="inputGroup">
          <label htmlFor="project-name">Nombre del proyecto</label>
          <input
            id="project-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Escribe un nombre"
          />
        </div>
        <div className="inputGroup">
          <label htmlFor="project-template">Tipo de plantilla</label>
          <select
            id="project-template"
            className="select"
            value={template}
            onChange={(event) => setTemplate(event.target.value as ProjectTemplate)}
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <ul className="templateInfo">
          {templateOptions.map((option) => (
            <li key={option.value} className={option.value === template ? 'templateActive' : ''}>
              <strong>{option.label}:</strong> {option.description}
            </li>
          ))}
        </ul>
        <button type="submit" className="buttonPrimary">
          Crear proyecto
        </button>
      </form>
      <div className="recentProjects">
        <h3 className="panelTitle">Recientes</h3>
        {!hasProjects && <p>No hay proyectos guardados aún.</p>}
        {hasProjects && (
          <ul className="projectList">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className={`projectButton ${currentProject?.id === project.id ? 'projectButtonActive' : ''}`}
                  onClick={() => loadProject(project.id)}
                >
                  <span className="projectName">{project.name}</span>
                  <span className="projectMeta">
                    {new Date(project.updatedAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
