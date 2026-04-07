import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFromUrl(url: string, folder: string, publicId?: string): Promise<string> {
  const options: Record<string, any> = { folder };
  if (publicId) options.public_id = publicId;

  const result = await cloudinary.uploader.upload(url, options);
  return result.secure_url;
}
