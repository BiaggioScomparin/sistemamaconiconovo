// File validation utilities for secure file uploads

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  safeFileName?: string;
  fileExtension?: string;
}

/**
 * Validates an image file for upload
 * Checks file size, MIME type, and extension
 */
export function validateImageFile(file: File): FileValidationResult {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Foto deve ter no máximo 5MB',
    };
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Apenas imagens JPG, PNG ou WEBP são permitidas',
    };
  }

  // Validate and extract file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !ALLOWED_IMAGE_EXTENSIONS.includes(fileExt)) {
    return {
      valid: false,
      error: 'Extensão de arquivo inválida',
    };
  }

  // Generate safe filename using crypto UUID
  const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  return {
    valid: true,
    safeFileName,
    fileExtension: fileExt,
  };
}

/**
 * Validates and prepares an image file for upload
 * Returns the validated file info or throws an error
 */
export function getValidatedFileName(file: File, prefix?: string): string {
  const validation = validateImageFile(file);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return prefix ? `${prefix}/${validation.safeFileName}` : validation.safeFileName!;
}
