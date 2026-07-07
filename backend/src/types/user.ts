export interface CmsUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  token: string | null;
  last_access: string | Date | null;
  status: string;
}

export interface CmsRoleRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  admin_access: boolean;
  app_access: boolean;
}

export interface AuthenticatedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  admin_access: boolean;
  app_access: boolean;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  admin_access: boolean;
  app_access: boolean;
  last_access: string | null;
}
