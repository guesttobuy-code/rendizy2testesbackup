import { Context } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from './utils-env.ts';

const BUCKET_NAME = 'make-67caf26a-property-photos';

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY ?? ''
  );
};

// Ensure bucket exists
async function ensureBucketExists() {
  const supabase = getSupabaseClient();
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log(`Creating bucket: ${BUCKET_NAME}`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false, // Private bucket
      fileSizeLimit: 5242880, // 5MB (reduced from 10MB)
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    });
    
    if (error) {
      console.error('Error creating bucket:', error);
      throw error;
    }
  }
}

/**
 * POST /make-server-67caf26a/photos/upload
 * Upload a photo to Supabase Storage
 */
export async function uploadPhoto(c: Context) {
  try {
    console.log('📸 Starting photo upload...');
    
    // Ensure bucket exists
    try {
      await ensureBucketExists();
      console.log('✅ Bucket verified');
    } catch (bucketError) {
      console.error('❌ Bucket error:', bucketError);
      return c.json({ 
        error: 'Failed to ensure bucket exists',
        details: bucketError instanceof Error ? bucketError.message : 'Unknown error'
      }, 500);
    }
    
    // Parse form data
    let formData;
    try {
      formData = await c.req.formData();
      console.log('✅ FormData parsed');
    } catch (formError) {
      console.error('❌ FormData error:', formError);
      return c.json({ 
        error: 'Failed to parse form data',
        details: formError instanceof Error ? formError.message : 'Unknown error'
      }, 400);
    }
    
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;
    const room = formData.get('room') as string;
    
    console.log('📋 Upload params:', {
      hasFile: !!file,
      propertyId,
      room,
      fileType: file?.type,
      fileSize: file?.size
    });
    
    if (!file) {
      console.error('❌ No file in formData');
      return c.json({ error: 'No file provided' }, 400);
    }
    
    if (!propertyId) {
      console.error('❌ No propertyId in formData');
      return c.json({ error: 'Property ID is required' }, 400);
    }
    
    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      console.error('❌ File too large:', file.size, 'bytes');
      return c.json({ 
        error: 'File too large',
        details: `Maximum file size is 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        maxSizeMB: 5,
        actualSizeMB: (file.size / 1024 / 1024).toFixed(2)
      }, 413);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const fileName = `${propertyId}/${room || 'external'}/${timestamp}-${randomStr}.${extension}`;
    
    console.log('📁 Generated filename:', fileName);
    
    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('✅ File converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
    } catch (bufferError) {
      console.error('❌ ArrayBuffer error:', bufferError);
      return c.json({ 
        error: 'Failed to read file',
        details: bufferError instanceof Error ? bufferError.message : 'Unknown error'
      }, 500);
    }
    
    const buffer = new Uint8Array(arrayBuffer);
    
    console.log('☁️ Uploading to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      return c.json({ 
        error: 'Failed to upload file', 
        details: JSON.stringify(error)
      }, 500);
    }
    
    console.log('✅ Upload successful:', data);
    
    // Generate signed URL (valid for 1 year)
    console.log('🔗 Generating signed URL...');
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 31536000); // 1 year
    
    if (urlError) {
      console.error('❌ Signed URL error:', urlError);
      return c.json({ 
        error: 'Failed to generate URL', 
        details: JSON.stringify(urlError)
      }, 500);
    }
    
    console.log('✅ Signed URL generated');
    
    const response = {
      success: true,
      photo: {
        id: `photo-${timestamp}-${randomStr}`,
        url: urlData.signedUrl,
        path: fileName,
        room: room || 'external',
        order: 0
      }
    };
    
    console.log('✅ Upload complete:', response);
    
    return c.json(response);
    
  } catch (error) {
    console.error('❌ Unexpected error in uploadPhoto:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return c.json({ 
      error: 'Failed to upload photo',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
}

/**
 * POST /make-server-67caf26a/photos
 * Upload a photo from base64 data (for FigmaTestPropertyCreator)
 */
export async function uploadPhotoBase64(c: Context) {
  try {
    console.log('📸 Starting base64 photo upload...');
    
    // Ensure bucket exists
    try {
      await ensureBucketExists();
      console.log('✅ Bucket verified');
    } catch (bucketError) {
      console.error('❌ Bucket error:', bucketError);
      return c.json({ 
        error: 'Failed to ensure bucket exists',
        details: bucketError instanceof Error ? bucketError.message : 'Unknown error'
      }, 500);
    }
    
    // Parse JSON body
    const body = await c.req.json();
    const { propertyId, imageData, caption, tags, isPrimary } = body;
    
    console.log('📋 Upload params:', {
      propertyId,
      hasImageData: !!imageData,
      caption,
      tagsCount: tags?.length,
      isPrimary
    });
    
    if (!imageData) {
      console.error('❌ No imageData in body');
      return c.json({ error: 'No image data provided' }, 400);
    }
    
    if (!propertyId) {
      console.error('❌ No propertyId in body');
      return c.json({ error: 'Property ID is required' }, 400);
    }
    
    // Extract base64 data (remove data:image/...;base64, prefix)
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('❌ Invalid base64 format');
      return c.json({ error: 'Invalid base64 image data' }, 400);
    }
    
    const [, extension, base64Data] = base64Match;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('✅ Image converted to Uint8Array:', bytes.length, 'bytes');
    
    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (bytes.length > MAX_FILE_SIZE) {
      console.error('❌ File too large:', bytes.length, 'bytes');
      return c.json({ 
        error: 'File too large',
        details: `Maximum file size is 5MB. Your file is ${(bytes.length / 1024 / 1024).toFixed(2)}MB`,
        maxSizeMB: 5,
        actualSizeMB: (bytes.length / 1024 / 1024).toFixed(2)
      }, 413);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${propertyId}/external/${timestamp}-${randomStr}.${extension}`;
    
    console.log('📁 Generated filename:', fileName);
    
    // Upload to Supabase Storage
    const supabase = getSupabaseClient();
    
    console.log('☁️ Uploading to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, bytes, {
        contentType: `image/${extension}`,
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      return c.json({ 
        error: 'Failed to upload file', 
        details: JSON.stringify(error)
      }, 500);
    }
    
    console.log('✅ Upload successful:', data);
    
    // Generate signed URL (valid for 1 year)
    console.log('🔗 Generating signed URL...');
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 31536000); // 1 year
    
    if (urlError) {
      console.error('❌ Signed URL error:', urlError);
      return c.json({ 
        error: 'Failed to generate URL', 
        details: JSON.stringify(urlError)
      }, 500);
    }
    
    console.log('✅ Signed URL generated');
    
    const response = {
      success: true,
      id: `photo-${timestamp}-${randomStr}`,
      url: urlData.signedUrl,
      path: fileName,
      caption: caption || '',
      tags: tags || [],
      isPrimary: isPrimary || false,
      room: 'external',
      order: 0
    };
    
    console.log('✅ Upload complete:', response);
    
    return c.json(response);
    
  } catch (error) {
    console.error('❌ Unexpected error in uploadPhotoBase64:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return c.json({ 
      error: 'Failed to upload photo',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
}

/**
 * DELETE /make-server-67caf26a/photos/:path
 * Delete a photo from Supabase Storage
 */
export async function deletePhoto(c: Context) {
  try {
    const path = c.req.param('path');
    
    if (!path) {
      return c.json({ error: 'Path is required' }, 400);
    }
    
    const supabase = getSupabaseClient();
    
    // Decode the path (might be URL encoded)
    const decodedPath = decodeURIComponent(path);
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([decodedPath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return c.json({ error: 'Failed to delete file', details: error }, 500);
    }
    
    return c.json({ success: true });
    
  } catch (error) {
    console.error('Error in deletePhoto:', error);
    return c.json({ 
      error: 'Failed to delete photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * PUT /make-server-67caf26a/photos/:photoId
 * Update photo metadata (for updating propertyId after property creation)
 */
export async function updatePhoto(c: Context) {
  try {
    const photoId = c.req.param('photoId');
    const body = await c.req.json();
    
    console.log('📝 Updating photo:', photoId, 'with data:', body);
    
    // This is a metadata update - we just return success
    // In a real implementation, you might want to move the file or update a database record
    return c.json({ 
      success: true,
      message: 'Photo metadata updated',
      photoId,
      updates: body
    });
    
  } catch (error) {
    console.error('Error in updatePhoto:', error);
    return c.json({ 
      error: 'Failed to update photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * GET /make-server-67caf26a/photos/property/:propertyId
 * List all photos for a property
 */
export async function listPropertyPhotos(c: Context) {
  try {
    const propertyId = c.req.param('propertyId');
    
    if (!propertyId) {
      return c.json({ error: 'Property ID is required' }, 400);
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(propertyId);
    
    if (error) {
      console.error('Error listing files:', error);
      return c.json({ error: 'Failed to list files', details: error }, 500);
    }
    
    // Generate signed URLs for all photos
    const photos = await Promise.all(
      (data || []).map(async (file) => {
        const filePath = `${propertyId}/${file.name}`;
        
        const { data: urlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filePath, 31536000); // 1 year
        
        // Extract room from path (if structured as propertyId/room/filename)
        const parts = file.name.split('/');
        const room = parts.length > 1 ? parts[0] : 'external';
        
        return {
          id: file.name,
          url: urlData?.signedUrl || '',
          path: filePath,
          room,
          order: 0,
          createdAt: file.created_at
        };
      })
    );
    
    return c.json({ photos });
    
  } catch (error) {
    console.error('Error in listPropertyPhotos:', error);
    return c.json({ 
      error: 'Failed to list photos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}