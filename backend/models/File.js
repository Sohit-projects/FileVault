const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true, // bytes
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      unique: true,
    },
    downloadUrl: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      default: 'root',
      trim: true,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    tags: [{ type: String, trim: true }],
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicShareToken: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: formatted size
fileSchema.virtual('formattedSize').get(function () {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return `${parseFloat((this.size / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
});

// Virtual: file category
fileSchema.virtual('category').get(function () {
  const mime = this.mimeType;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'document';
  if (mime.includes('sheet') || mime.includes('excel')) return 'spreadsheet';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return 'archive';
  if (mime.startsWith('text/')) return 'text';
  return 'other';
});

// Indexes
fileSchema.index({ user: 1, isTrashed: 1, createdAt: -1 });
fileSchema.index({ user: 1, folder: 1 });
fileSchema.index({ user: 1, isStarred: 1 });
fileSchema.index({ publicShareToken: 1 });
fileSchema.index({ name: 'text', originalName: 'text', tags: 'text' });

const File = mongoose.model('File', fileSchema);

module.exports = File;
