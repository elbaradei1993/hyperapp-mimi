import { supabase } from '../lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadOptions {
  maxSize?: number; // in bytes, default 5MB
  allowedTypes?: string[]; // MIME types
  quality?: number; // for image compression (0-1)
}

class UploadService {
  private readonly DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly BUCKET_NAME = 'profile-pictures';

  /**
   * Upload a profile picture to Supabase storage
   */
  async uploadProfilePicture(
    file: File,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file, options);

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      // Compress image if needed
      const processedFile = await this.processImage(file, options.quality || 0.8);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true // Replace existing file
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete a profile picture from storage
   */
  async deleteProfilePicture(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    } catch (error) {
      console.error('Profile picture delete failed:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  private async validateFile(file: File, options: UploadOptions): Promise<void> {
    const maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    const allowedTypes = options.allowedTypes || this.DEFAULT_ALLOWED_TYPES;

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Additional image validation
    if (file.type.startsWith('image/')) {
      await this.validateImageDimensions(file);
    }
  }

  /**
   * Validate image dimensions
   */
  private async validateImageDimensions(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        // Check minimum dimensions (at least 100x100)
        if (img.width < 100 || img.height < 100) {
          reject(new Error('Image must be at least 100x100 pixels'));
        }
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Invalid image file'));
      };
      img.src = objectUrl;
    });
  }

  /**
   * Process and compress image
   */
  private async processImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800px on longest side)
        const maxSize = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(processedFile);
            } else {
              resolve(file); // Fallback to original file
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const uploadService = new UploadService();
export default uploadService;
