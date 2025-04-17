import api from './axios';
import authService from './auth';
import userService from './users';
import projectService from './projects';
import taskService from './tasks';
import commentService from './comments';
import occupationService from './occupations';
import roleService from './roles';
import teamService from './teams';

export {
  api,
  authService,
  userService,
  projectService,
  taskService,
  commentService,
  occupationService,
  roleService,
  teamService
};

// Tipos
export type { LoginCredentials, AuthResponse, User as AuthUser } from './auth';
export type { User, CreateUserRequest, UpdateUserRequest } from './users';
export type { Project, ProjectPriority } from './projects';
export type { Task, TaskPriority, TaskStatus } from './tasks';
export type { Comment } from './comments';
export type { Occupation } from './occupations';
export type { Role } from './roles';
export type { Team, TeamUser, CreateTeamRequest, UpdateTeamRequest, AddUserToTeamRequest } from './teams';
