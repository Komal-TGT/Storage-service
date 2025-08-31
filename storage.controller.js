const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per receipt
});

const { uploadPdf, generateSasUrl, streamDownload, getBlobInfo } = require('../services/blob.service');
function asyncHandler(fn) {
  return (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(400).json({ error: err.message || 'Request failed' });
  });
}

// POST /api/receipts/upload (multipart/form-data)
const uploadHandler = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new Error('No file uploaded');
    if (!['application/pdf', 'application/octet-stream'].includes(req.file.mimetype)) {
      throw new Error('Only PDF files are allowed');
    }
    const { clientId, posId, dateISO, receiptId } = req.body;
    const { blobPath } = await uploadPdf({
      buffer: req.file.buffer,
      clientId,
      posId,
      dateISO,
      receiptId,
    });
    res.json({ ok: true, blobPath });
  })
];

// POST /api/receipts/signed-url
const signedUrlHandler = asyncHandler(async (req, res) => {
  const { blobPath, expirySeconds, permissions, permanent } = req.body;
  const out = await generateSasUrl({ blobPath, expirySeconds, permissions, permanent });
  res.json(out);
});

// GET /api/receipts/download
const downloadHandler = asyncHandler(async (req, res) => {
  const { blobPath, attachment } = req.query;
  await streamDownload({ blobPath, res, asAttachment: attachment === 'true' });
});

// GET /api/receipts/info
const infoHandler = asyncHandler(async (req, res) => {
  const { blobPath } = req.query;
  const info = await getBlobInfo({ blobPath });
  res.json(info);
});

module.exports = {
  uploadHandler,
  signedUrlHandler,
  downloadHandler,
  infoHandler,
};

