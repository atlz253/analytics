import { MongoClientOptions } from "mongodb";
import z from "zod";

export const mongoClientOptionsSchema = z.object({
  user: z.string(),
  password: z.string(),
  hosts: z.string(),
  options: z.custom<MongoClientOptions>().optional(),
});
export type MongoClientOptionsSchema = z.infer<typeof mongoClientOptionsSchema>;
