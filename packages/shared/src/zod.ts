import { z } from "zod";

export const intStringParser = z
  .string()
  .regex(/^\d+$/)
  .transform((val) => parseInt(val));

/**
 * {@link https://github.com/colinhacks/zod/issues/4143#issuecomment-2845134912}
 */
export const functionSchema = <T extends z.core.$ZodFunction>(schema: T) =>
  // @ts-expect-error Тип функции заранее не известен
  z.custom<Parameters<T["implement"]>[0]>((fn) => schema.implement(fn));

/**
 * {@link https://github.com/colinhacks/zod/issues/4143#issuecomment-2845134912}
 */
export const createAsyncFunctionSchema = <T extends z.core.$ZodFunction>(
  schema: T
) =>
  z.custom<Parameters<T["implementAsync"]>[0]>((fn) =>
    // @ts-expect-error Тип функции заранее не известен
    schema.implementAsync(fn)
  );
