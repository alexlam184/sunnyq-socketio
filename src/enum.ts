export enum MESSAGE {
  CONNECTION = 'connection',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECTION_ERROR = 'connect_error',

  FETCH_USERID = 'user:fetch-id',

  JOIN_ROOM = 'room:join-room',
  FETCH_REQUEST = 'room:fetch-request',
  FETCH_ROOM = 'room:fetch-room',
  SUBMIT_ANSWER = 'room:submit-answer',
  DELETE_ROOM = 'room:delete-room',
  CHANGE_ROOM_DATA = 'room:change-data',

  FETCH_LOBBY = 'lobby:fetch-lobby',
  CREATE_ROOM = 'lobby:host-create-room',
  UPDATE_LOBBY = 'lobby:update',
}
