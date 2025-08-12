// frontend/src/hooks/useBackendServices.ts
import * as authHooks from '../services/backend/auth';
import * as commentsHooks from '../services/backend/comments';
import * as teamsHooks from '../services/backend/teams';
import * as projectsHooks from '../services/backend/projects';
import * as rolesHooks from '../services/backend/roles';
import * as tasksHooks from '../services/backend/tasks';
import * as usersHooks from '../services/backend/users';
import * as profileHooks from '../services/backend/profile';
import * as occupationsHooks from '../services/backend/occupations';
import * as recurringTasksHooks from '../services/backend/recurring-tasks';

export const useBackendServices = () => {
  return {
    auth: authHooks,
    comments: commentsHooks,
    teams: teamsHooks,
    projects: projectsHooks,
    roles: rolesHooks,
    tasks: tasksHooks,
    profile: profileHooks,
    users: usersHooks,
    occupations: occupationsHooks,
    recurringTasks: recurringTasksHooks,
  };
};