import multer from 'multer';
import { MAX_GPX_SIZE_BYTES } from '../config/gpx.config.js';

// The same limit in MB, for the error message
const MAX_GPX_SIZE_MB = MAX_GPX_SIZE_BYTES / (1024 * 1024);

function gpxUpload(upload) {
  return (req, res, next) => {
    upload(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `The file is too large (max ${MAX_GPX_SIZE_MB} MB)` });
        }
        if (error.code === 'LIMIT_FIELD_VALUE') {
          return res.status(413).json({ error: 'The trail details are too large.' });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      if (error) return next(error);

      req.file ??= req.files?.file?.[0];
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded: send it in the "file" field' });
      }
      if (!/\.gpx$/i.test(req.file.originalname)) {
        return res.status(400).json({ error: 'The file must have the .gpx extension' });
      }

      next();
    });
  };
}

const storage = multer.memoryStorage();
export const uploadGpx = gpxUpload(multer({
  storage,
  limits: { fileSize: MAX_GPX_SIZE_BYTES, files: 1 },
}).single('file'));

export const uploadTrailGpx = gpxUpload(multer({
  storage,
  limits: { fileSize: MAX_GPX_SIZE_BYTES, files: 2, fields: 6, fieldSize: 8 * 1024 },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]));
