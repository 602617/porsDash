// src/types/User.ts
export interface User {
  id: number;
  username: string;
  email?: string;  // match whatever fields UserDto has
}
