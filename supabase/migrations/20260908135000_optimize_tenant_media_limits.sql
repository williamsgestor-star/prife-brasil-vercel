-- Keep subdomain media within a mobile-friendly ceiling. Images are converted to
-- WebP in the admin editor before upload; videos above 10 MB are rejected.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[]
where id = 'tenant-media';
