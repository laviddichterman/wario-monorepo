import { z } from 'zod';

export const ZodEmailSchema = z.email({ message: "Please enter a valid e-mail address." })
  .min(5, "Valid e-mail addresses are longer.")
  .refine((v) => !v.endsWith('con'), { message: ".con is not a valid TLD. Did you mean .com?" })
  .refine((v) => !v.endsWith('ney'), { message: ".ney is not a valid TLD. Did you mean .net?" });