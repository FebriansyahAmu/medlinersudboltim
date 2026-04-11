import * as Yup from "yup";

export const loginSchema = Yup.object({
  username: Yup.string().trim().required("Username wajib diisi"),

  password: Yup.string()
    .min(6, "Minimal 6 karakter")
    .trim()
    .required("Password wajib diisi"),
});
