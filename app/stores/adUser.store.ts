import { defineStore } from 'pinia';

interface IUserData {
  fName: string;
  dep: string;
  email: string;
  name: string;
  sessionId: string;
  status: boolean;
  authMetod: '';
}

interface IAuthState {
  user: IUserData;
}
