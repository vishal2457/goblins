import { z } from "zod";

export const v_pagination = z.object({
  page: z.coerce.number(),
  limit: z.coerce.number(),
});

export const c_pagination = z
  .function()
  .args(
    z.object({
      page: z.coerce.number(),
      limit: z.coerce.number(),
    }),
  )
  .returns(
    z.object({
      limit: z.number(),
      offset: z.number(),
    }),
  )
  .implement(({ page, limit }) => {
    return {
      offset: (page - 1) * limit,
      limit,
    };
  });

export type t_pagination = z.infer<typeof v_pagination>;
