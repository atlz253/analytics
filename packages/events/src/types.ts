export interface UserActivityEvent {
  eventType: "userActivity";
  occurrenceTime: Date;
  type: string;
  userUUID: string;
  page: string;
  createTime?: Date;
  [key: string]: unknown;
}
