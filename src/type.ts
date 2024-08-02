export type User = {
  userid: string;
  answer: string;
};
export type Room = {
  users: User[];
  num_of_answered: number;
  num_of_students: number;
  phase: string; //PAUSE
  host: {
    userid: string;
  };
};
