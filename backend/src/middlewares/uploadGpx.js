import multer from 'multer';
import { MAX_GPX_SIZE_BYTES } from '../config/gpx.config.js';

// The same limit in MB, for the error message
const MAX_GPX_SIZE_MB = MAX_GPX_SIZE_BYTES / (1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_GPX_SIZE_BYTES, files: 1 },
}).single('file');

export function uploadGpx(req, res, next) {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `The file is too large (max ${MAX_GPX_SIZE_MB} MB)` });
      }
      // e.g. the file was sent in a field with another name
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
    if (error) return next(error);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded: send it in the "file" field' });
    }
    if (!/\.gpx$/i.test(req.file.originalname)) {
      return res.status(400).json({ error: 'The file must have the .gpx extension' });
    }

    next();
  });
}