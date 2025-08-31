const router = require('express').Router();
const {
  uploadHandler,
  signedUrlHandler,
  downloadHandler,
  infoHandler,
} = require('../controllers/storage.controller');

router.post('/receipts/upload', ...uploadHandler);
router.post('/receipts/signed-url', signedUrlHandler);
router.get('/receipts/download', downloadHandler);
router.get('/receipts/info', infoHandler);

module.exports = router;
