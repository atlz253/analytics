export interface UserActivityEvent {
  eventType: "userActivity";
  occurrenceTime: string;
  type: string;
  userUUID: string;
  page: string;
  createTime?: string;
  [key: string]: unknown;
}
