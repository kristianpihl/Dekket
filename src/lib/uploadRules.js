// What kind of files may be uploaded. The limits must match the storage bucket in supabase/documents.sql.
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
export const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
