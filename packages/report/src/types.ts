export interface UsersReport {
  [userUUID: string]: {
    eventsCount: number;
  };
}

export interface UserReport {
  events: {
    [type: string]: {
      count: number;
    };
  };
}
