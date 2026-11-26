// Generuje token do bezpośredniego wysłania pliku z przeglądarki do Vercel Blob
// (omija limit 4,5 MB na body funkcji serverless).
import { handleUpload } from '@vercel/blob/client';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 500);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('videos/') || !pathname.toLowerCase().endsWith('.mp4')) {
          throw new Error('Dozwolone są tylko pliki .mp4');
        }
        return {
          allowedContentTypes: ['video/mp4'],
          maximumSizeInBytes: MAX_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Błąd uploadu' });
  }
}
