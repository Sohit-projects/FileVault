const { v4: uuidv4 } = require('uuid');
const path = require('path');
const File = require('../models/File');
const User = require('../models/User');
const { getCloudinary, cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

const MAX_STORAGE_BYTES = parseInt(process.env.MAX_STORAGE_GB || '5') * 1024 * 1024 * 1024;

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: options.folder,
        public_id: options.publicId,
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Helper: delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
};

// ─── UPLOAD FILES ─────────────────────────────────────────────────────────────
exports.uploadFiles = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'No files provided.' });
    }

    const user = req.user;
    const folder = req.body.folder || 'root';
    // Check storage capacity
    const totalUploadSize = req.files.reduce((sum, f) => sum + f.size, 0);
    if (user.storageUsed + totalUploadSize > user.storageLimit) {
      return res.status(413).json({
        success: false,
        message: 'Storage limit exceeded. Please delete some files or upgrade your plan.',
      });
    }

    const uploadedFiles = [];
    const errors = [];
    const cloudFolder = `filestorage/users/${user._id}/${folder}`;

    await Promise.all(
      req.files.map(async (file) => {
        try {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueName = `${uuidv4()}${ext}`;
          const publicId = `${cloudFolder}/${uniqueName.replace(ext, '')}`;

          const uploadResult = await uploadToCloudinary(file.buffer, {
            public_id: publicId,
            folder: cloudFolder,
            resource_type: 'auto',
          });

          const savedFile = await File.create({
            user: user._id,
            name: file.originalname,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            extension: ext,
            cloudinaryPublicId: uploadResult.public_id,
            downloadUrl: uploadResult.secure_url,
            thumbnailUrl: uploadResult.secure_url,
            folder,
          });

          uploadedFiles.push(savedFile);
        } catch (err) {
          logger.error(`File upload error for ${file.originalname}: ${err.message}`);
          errors.push({ file: file.originalname, error: err.message });
        }
      })
    );

    // Update user storage
    const successSize = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: successSize } });

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      data: { files: uploadedFiles, errors },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET USER FILES ───────────────────────────────────────────────────────────
exports.getFiles = async (req, res, next) => {
  try {
    const {
      folder = 'root',
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
      starred,
      trashed = 'false',
    } = req.query;

    const query = { user: req.user._id };

    if (trashed === 'true') {
      query.isTrashed = true;
    } else {
      query.isTrashed = false;
      if (folder) query.folder = folder;
    }

    if (starred === 'true') query.isStarred = true;
    if (search) query.$text = { $search: search };
    if (category) {
      const categoryMimeMap = {
        image: /^image\//,
        video: /^video\//,
        audio: /^audio\//,
        pdf: /application\/pdf/,
        document: /word|document/,
        spreadsheet: /sheet|excel/,
        archive: /zip|rar|tar/,
        text: /^text\//,
      };
      if (categoryMimeMap[category]) {
        query.mimeType = categoryMimeMap[category];
      }
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [files, total] = await Promise.all([
      File.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      File.countDocuments(query),
    ]);

    // Cloudinary URLs are permanent, no refresh needed
    const refreshedFiles = files;

    res.status(200).json({
      success: true,
      data: {
        files: refreshedFiles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE FILE ──────────────────────────────────────────────────────────
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    file.lastAccessedAt = new Date();
    await file.save();

    res.status(200).json({ success: true, data: { file } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE FILE ──────────────────────────────────────────────────────────────
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(file.cloudinaryPublicId);
    } catch (err) {
      logger.warn(`Could not delete file from Cloudinary: ${err.message}`);
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });
    await file.deleteOne();

    res.status(200).json({ success: true, message: 'File deleted permanently.' });
  } catch (error) {
    next(error);
  }
};

// ─── TRASH FILE ───────────────────────────────────────────────────────────────
exports.trashFile = async (req, res, next) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: true, trashedAt: new Date() },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    res.status(200).json({ success: true, message: 'File moved to trash.', data: { file } });
  } catch (error) {
    next(error);
  }
};

// ─── RESTORE FILE ─────────────────────────────────────────────────────────────
exports.restoreFile = async (req, res, next) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isTrashed: false, trashedAt: null },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    res.status(200).json({ success: true, message: 'File restored.', data: { file } });
  } catch (error) {
    next(error);
  }
};

// ─── STAR/UNSTAR ──────────────────────────────────────────────────────────────
exports.toggleStar = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    file.isStarred = !file.isStarred;
    await file.save();

    res.status(200).json({
      success: true,
      message: file.isStarred ? 'File starred.' : 'File unstarred.',
      data: { file },
    });
  } catch (error) {
    next(error);
  }
};

// ─── RENAME FILE ──────────────────────────────────────────────────────────────
exports.renameFile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'File name is required.' });

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { name: name.trim() },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    res.status(200).json({ success: true, message: 'File renamed.', data: { file } });
  } catch (error) {
    next(error);
  }
};

// ─── STORAGE STATS ────────────────────────────────────────────────────────────
exports.getStorageStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [stats, user] = await Promise.all([
      File.aggregate([
        { $match: { user: userId, isTrashed: false } },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$size' },
            images: { $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /^image\// } }, 1, 0] } },
            videos: { $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /^video\// } }, 1, 0] } },
            documents: { $sum: { $cond: [{ $regexMatch: { input: '$mimeType', regex: /pdf|word|document/ } }, 1, 0] } },
            others: { $sum: 1 },
          },
        },
      ]),
      User.findById(userId),
    ]);

    res.status(200).json({
      success: true,
      data: {
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storageUsedPercentage: user.storageUsedPercentage,
        stats: stats[0] || { totalFiles: 0, totalSize: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET DOWNLOAD URL ─────────────────────────────────────────────────────────
exports.getDownloadUrl = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    // Cloudinary URLs - use download flag with original filename
    const url = cloudinary.url(file.cloudinaryPublicId, {
      secure: true,
      resource_type: 'auto',
      flags: 'download',
      filename: file.originalName,
    });

    file.downloadCount += 1;
    file.lastAccessedAt = new Date();
    await file.save();

    res.status(200).json({ success: true, data: { url, fileName: file.originalName } });
  } catch (error) {
    next(error);
  }
};

// ─── PROXY FILE FOR PREVIEW ───────────────────────────────────────────────────
exports.proxyFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    // Fetch the file from Cloudinary and stream it to the client
    const https = require('https');
    const http = require('http');

    const protocol = file.downloadUrl.startsWith('https') ? https : http;

    // Support both inline preview and download via query param
    const isDownload = req.query.download === 'true';
    const disposition = isDownload 
      ? `attachment; filename="${file.originalName}"` 
      : `inline; filename="${file.originalName}"`;

    protocol.get(file.downloadUrl, (stream) => {
      // Set the content-type header from the file's mime type
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', disposition);
      
      // Pipe the Cloudinary stream to the response
      stream.pipe(res);

      stream.on('error', (err) => {
        logger.error(`Error streaming file: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error streaming file' });
        }
      });
    }).on('error', (err) => {
      logger.error(`Error fetching file from Cloudinary: ${err.message}`);
      res.status(500).json({ success: false, message: 'Error fetching file' });
    });
  } catch (error) {
    next(error);
  }
};
