import bcrypt from "bcryptjs";

export const hashPassword = (password: string): string => bcrypt.hashSync(password, 12);

export const checkPassword = (password: string, hash: string): boolean =>
  bcrypt.compareSync(password, hash);
