import { MongoClientOptions } from "mongodb";
import z from "zod";

import { intStringParser } from "./zod.js";

export const mongoClientOptionsSchema = z.object({
  user: z.string(),
  password: z.string(),
  hosts: z.string(),
  port: z.union([intStringParser, z.int()]),
  options: z.custom<MongoClientOptions>().optional(),
});
export type MongoClientOptionsSchema = z.infer<typeof mongoClientOptionsSchema>;
