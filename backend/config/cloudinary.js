const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

const initCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    logger.info('Cloudinary initialized successfully');
    return cloudinary;
  } catch (error) {
    logger.error(`Cloudinary initialization error: ${error.message}`);
    throw error;
  }
};

const getCloudinary = () => cloudinary;

module.exports = { initCloudinary, getCloudinary, cloudinary };