export function checkPhotoAdminToken(provided: string | null | undefined): boolean {
  const expected = process.env.PHOTO_ADMIN_TOKEN
  if (!expected) return false
  if (!provided) return false
  return provided === expected
}
