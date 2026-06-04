// src/types/User.ts
export interface User {
  id: number;
  username: string;
  email?: string;
  role?: string;
  applicationRoles?: string[];
}
