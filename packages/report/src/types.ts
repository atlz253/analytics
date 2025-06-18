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

export interface EventTypesReport {
  events: {
    [type: string]: {
      count: number;
    };
  };
}
