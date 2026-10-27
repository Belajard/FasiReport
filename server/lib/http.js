export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const badRequest = (m, d) => new HttpError(400, m, d);
export const unauthorized = (m = "Sesi tidak valid. Silakan login kembali.") => new HttpError(401, m);
export const forbidden = (m = "Akses ditolak: Anda tidak memiliki izin untuk aksi ini.") => new HttpError(403, m);
export const notFound = (m = "Data tidak ditemukan.") => new HttpError(404, m);
export const conflict = (m) => new HttpError(409, m);

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Parse body/query memakai skema zod, lempar 400 berisi pesan yang ramah. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join(".");
    throw badRequest(field ? `${field}: ${issue.message}` : issue.message, result.error.issues);
  }
  return result.data;
}
