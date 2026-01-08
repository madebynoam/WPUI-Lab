import { Project } from '../types';

/**
 * Migrates a project object to the current schema version.
 * This function is storage-provider agnostic and should be called
 * whenever project data is loaded from any source (localStorage, Supabase, etc.)
 */
export function migrateProject(project: any): Project {
  // Ensure globalComponents array exists (added in schema version 4)
  if (!project.globalComponents) {
    project.globalComponents = [];
  }

  // Future migrations can be added here as the schema evolves
  // Example:
  // if (project.version < 5) {
  //   // Migrate to version 5
  //   project.someNewField = defaultValue;
  //   project.version = 5;
  // }

  return project as Project;
}

/**
 * Validates that a project has the minimum required structure
 */
export function validateProject(project: any): boolean {
  return (
    project &&
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    Array.isArray(project.pages) &&
    typeof project.currentPageId === 'string'
  );
}
