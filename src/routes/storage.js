const express = require('express');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

const router = express.Router();

// Initialize S3 Client
// Only initialize if credentials are present to avoid startup crashes if not configured
let s3Client = null;

if (config.s3.accessKeyId && config.s3.secretAccessKey && config.s3.bucketName) {
    s3Client = new S3Client({
        region: config.s3.region,
        endpoint: config.s3.endpoint,
        credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
        },
        forcePathStyle: true, // Required for some S3 compatible providers
    });
    console.log('[STORAGE] S3 Client initialized');
} else {
    console.warn('[STORAGE] S3 credentials missing, storage endpoints will be disabled');
}

// Middleware to check if S3 is configured
const requireS3 = (req, res, next) => {
    if (!s3Client) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'S3 storage is not configured. Please check environment variables.',
        });
    }
    next();
};

// GET /api/storage/test-connection - Test S3 connection
router.get('/test-connection', requireS3, async (req, res) => {
    try {
        const command = new HeadBucketCommand({ Bucket: config.s3.bucketName });
        await s3Client.send(command);
        res.json({
            status: 'success',
            message: 'Successfully connected to S3 bucket',
            bucket: config.s3.bucketName,
        });
    } catch (error) {
        console.error('[STORAGE] Connection test failed:', error);
        res.status(500).json({
            error: 'Connection Failed',
            message: error.message,
        });
    }
});

// GET /api/storage/files - List files in bucket
router.get('/files', requireS3, async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: config.s3.bucketName,
            MaxKeys: 100,
        });

        const response = await s3Client.send(command);

        const files = (response.Contents || []).map(item => ({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
        }));

        res.json({
            count: files.length,
            files: files,
        });
    } catch (error) {
        console.error('[STORAGE] List files failed:', error);
        res.status(500).json({
            error: 'List Failed',
            message: error.message,
        });
    }
});

// POST /api/storage/files - Upload a text file
router.post('/files', requireS3, async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'filename and content are required',
        });
    }

    try {
        const command = new PutObjectCommand({
            Bucket: config.s3.bucketName,
            Key: filename,
            Body: content,
            ContentType: 'text/plain',
        });

        await s3Client.send(command);

        res.status(201).json({
            status: 'success',
            message: 'File uploaded successfully',
            file: {
                key: filename,
                size: content.length,
            },
        });
    } catch (error) {
        console.error('[STORAGE] Upload failed:', error);
        res.status(500).json({
            error: 'Upload Failed',
            message: error.message,
        });
    }
});

// GET /api/storage/files/:key - Get file content (text only for this demo)
router.get('/files/:key', requireS3, async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: config.s3.bucketName,
            Key: req.params.key,
        });

        const response = await s3Client.send(command);

        // Convert stream to string
        const str = await response.Body.transformToString();

        res.json({
            key: req.params.key,
            content: str,
            contentType: response.ContentType,
            lastModified: response.LastModified,
        });
    } catch (error) {
        console.error('[STORAGE] Get file failed:', error);
        if (error.name === 'NoSuchKey') {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found',
            });
        }
        res.status(500).json({
            error: 'Get Failed',
            message: error.message,
        });
    }
});

// DELETE /api/storage/files/:key - Delete a file
router.delete('/files/:key', requireS3, async (req, res) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: config.s3.bucketName,
            Key: req.params.key,
        });

        await s3Client.send(command);

        res.json({
            status: 'success',
            message: 'File deleted successfully',
            key: req.params.key,
        });
    } catch (error) {
        console.error('[STORAGE] Delete failed:', error);
        res.status(500).json({
            error: 'Delete Failed',
            message: error.message,
        });
    }
});

module.exports = router;
