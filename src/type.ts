import { ROOM_PHASE } from './room-phase';
export type User = {
  userid: string;
  username: string;
  answers?: any[];
};

export type Room = {
  roomCode: string;
  phase: ROOM_PHASE;
  host: User;
  users: User[];
  questions: BaseQuestion[];
  num_of_students: number;
  num_of_answered: number;
};

export interface BaseQuestion {
  type: QUESTION;
  question: string;
  remark?: string;
  choices?: any[]; // Only used in Multiple Questions
  answer?: any;
}

export enum QUESTION {
  MultipleChoice = 'Multiple Choice',
  TextInput = 'Text Input',
  OpenEnd = 'Open End',
}
