export default {
  create: "events.create",
  createAfter: "events.create.after",
  createMultiple: "events.createMultiple",
  createMultipleAfter: "events.createMultiple.after",
  readMultiple: "events.readMultiple",
  readMultipleAfter: "events.readMultiple.after",
  dropDatabase: "events.dropDatabase",
  dropDatabaseAfter: "events.dropDatabase.after",
} as const;
