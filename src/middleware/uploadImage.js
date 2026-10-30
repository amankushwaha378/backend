
import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const uploadImage = multer({
  storage: multer.memoryStorage(),

  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new Error("Only JPEG, PNG and WebP images are allowed"),
      );
    }

    cb(null, true);
  },

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per image
    files: 5,
  },
});

export default uploadImage;
