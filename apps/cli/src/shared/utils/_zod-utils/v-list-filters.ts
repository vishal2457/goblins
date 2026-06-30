import { z } from "zod";

export interface FilterData {
  type: "text" | "number" | "select" | "date";
  value: number | string;
  field: string;
  condition:
    | "equals"
    | "greater than"
    | "less than"
    | "between"
    | "contains"
    | "not equal";
}

export const v_list_filters = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  fields: z.string().transform((str = ""): string[] => {
    return str?.length ? str.split(",").filter((s) => !!s) : [];
  }),
  sort: z
    .string()
    .transform((str, ctx): Partial<{ Asc: string; Desc: string }> => {
      try {
        return JSON.parse(str);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: "Invalid sort options" });
        return z.NEVER;
      }
    }),
  filters: z.string().transform((str, ctx): Record<string, string> => {
    try {
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: "Invalid filters" });
      return z.NEVER;
    }
  }),
});

export type ListFilters = z.infer<typeof v_list_filters>;
