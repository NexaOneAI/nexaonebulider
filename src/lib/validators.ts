import { z } from 'zod';

export const emailSchema = z.string().email('Email inválido');
export const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres');
export const nameSchema = z.string().min(2, 'Mínimo 2 caracteres').max(100);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  full_name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const projectNameSchema = z.string().min(1, 'Nombre requerido').max(100);
export const promptSchema = z.string().min(3, 'Prompt muy corto').max(10000);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
