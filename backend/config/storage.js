const multer = require('multer');
const fs = require('fs');
const path = require('path');

const USE_S3 = process.env.USE_S3 === 'true';
let s3ClientInstance = null;
let upload;

if (USE_S3) {
    const { S3Client } = require('@aws-sdk/client-s3');
    const multerS3 = require('multer-s3');
    
    s3ClientInstance = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
        }
    });

    upload = multer({
        storage: multerS3({
            s3: s3ClientInstance,
            bucket: process.env.AWS_S3_BUCKET || 'ted-capital-erp',
            metadata: function (req, file, cb) { cb(null, { fieldName: file.fieldname }); },
            key: function (req, file, cb) { cb(null, Date.now().toString() + '-' + file.originalname); }
        })
    });
    console.log("☁️  AWS S3 Storage Engine Initialized.");
} else {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    
    upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, uploadPath),
            filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
        })
    });
    console.log("📁 Local File Storage Engine Initialized.");
}

module.exports = { upload, USE_S3, s3ClientInstance };