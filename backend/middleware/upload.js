const multer = require('multer');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '100') * 1024 * 1024;

// Blocked MIME types for security
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'application/x-download',
  'application/bat',
  'application/x-bat',
  'application/com',
  'application/x-com',
  'application/exe',
  'application/x-exe',
  'application/x-winexe',
  'application/x-winhlp',
  'application/x-winhelp',
  'application/x-javascript',
  'application/hta',
  'application/x-ms-shortcut',
  'vms/exe',
];

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.js', '.msi', '.dll', '.com', '.hta'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();

  if (BLOCKED_MIME_TYPES.includes(file.mimetype) || BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type "${ext}" is not allowed for security reasons.`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter,
});

module.exports = { upload };
