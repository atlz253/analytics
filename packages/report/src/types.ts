export interface UsersReport {
  [userUUID: string]: {
    eventsCount: number;
  };
}
