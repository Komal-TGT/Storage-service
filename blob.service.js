const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const {
  containerClient,
  backupContainerClient,
  serviceClient,
  permanentPolicyId,
} = require('../config/azure');
const {
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
  StorageSharedKeyCredential,
} = require('@azure/storage-blob');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
const defaultExpiry = parseInt(process.env.SAS_DEFAULT_EXPIRY_SECONDS || '3600', 10);

function buildPath({ clientId, posId, dateISO, receiptId }) {
  const d = dateISO ? new Date(dateISO) : new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const rid = receiptId || uuidv4();
  return `client/${clientId}/${yyyy}/${mm}/${dd}/${posId}/${rid}.pdf`;
}

function getClientsForPath(blobPath) {
  const blobClient = containerClient.getBlobClient(blobPath);
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  return { blobClient, blockBlobClient };
}

async function uploadPdf({ buffer, clientId, posId, dateISO, receiptId }) {
  if (!buffer || !clientId || !posId) throw new Error('Missing required fields');
  const blobPath = buildPath({ clientId, posId, dateISO, receiptId });
  const { blockBlobClient } = getClientsForPath(blobPath);

  const md5 = crypto.createHash('md5').update(buffer).digest();

  // Upload
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: 'application/pdf',
      blobContentDisposition: `inline; filename="${blobPath.split('/').pop()}"`,
      blobContentMD5: md5,
    },
    metadata: {
      clientId,
      posId,
      receiptDate: (dateISO || new Date().toISOString()).substring(0, 10),
    },
  });

  // Tag for backup processing
  await blockBlobClient.setTags({ backup: 'needed', client: clientId, pos: posId });

  return { blobPath };
}

// Generate SAS URL (expiring or via stored policy)
async function generateSasUrl({ blobPath, permissions = 'r', expirySeconds = defaultExpiry, permanent = false }) {
  const now = new Date();
  const cred = connStr ? undefined : new StorageSharedKeyCredential(accountName, accountKey);

  const sasOptions = {
    containerName: containerClient.containerName,
    blobName: blobPath,
    protocol: SASProtocol.Https,
  };

  if (permanent && permanentPolicyId) {
    sasOptions.identifier = permanentPolicyId; // ties to stored access policy
  } else {
    sasOptions.startsOn = new Date(now.getTime() - 60 * 1000); // clock skew
    sasOptions.expiresOn = new Date(now.getTime() + (expirySeconds || defaultExpiry) * 1000);
    sasOptions.permissions = BlobSASPermissions.parse(permissions);
  }

  const sas = generateBlobSASQueryParameters(sasOptions, cred);
  const url = containerClient.getBlobClient(blobPath).url + `?${sas.toString()}`;
  return { url, expiresIn: permanent ? null : expirySeconds };
}

async function streamDownload({ blobPath, res, asAttachment = false }) {
  const { blobClient } = getClientsForPath(blobPath);
  const exists = await blobClient.exists();
  if (!exists) throw new Error('Blob not found');
  const props = await blobClient.getProperties();
  res.setHeader('Content-Type', props.contentType || 'application/pdf');
  const fileName = blobPath.split('/').pop();
  res.setHeader('Content-Disposition', `${asAttachment ? 'attachment' : 'inline'}; filename="${fileName}"`);
  const download = await blobClient.download();
  download.readableStreamBody.pipe(res);
}

async function getBlobInfo({ blobPath }) {
  const { blobClient } = getClientsForPath(blobPath);
  const exists = await blobClient.exists();
  if (!exists) throw new Error('Blob not found');
  const [props, tags] = await Promise.all([
    blobClient.getProperties(),
    blobClient.getTags(),
  ]);
  return {
    url: blobClient.url,
    properties: {
      contentType: props.contentType,
      contentLength: props.contentLength,
      lastModified: props.lastModified,
      eTag: props.etag,
    },
    metadata: props.metadata,
    tags: tags.tags,
  };
}

// Backup tagged blobs → backup container
async function runBackupOnce() {
  // Find blobs with tag backup='needed'
  const where = `@backup = 'needed' AND @container = '${containerClient.containerName}'`;
  const iterator = serviceClient.findBlobsByTags(where);
  for await (const item of iterator) {
    const blobPath = item.blobName;
    const src = containerClient.getBlobClient(blobPath);

    // create short-lived read SAS for copy source
    const { url: sasUrl } = await generateSasUrl({ blobPath, permissions: 'r', expirySeconds: 600, permanent: false });

    const dest = backupContainerClient.getBlockBlobClient(blobPath);
    const poller = await dest.beginCopyFromURL(sasUrl);
    await poller.pollUntilDone();

    // Mark as backed up
    await containerClient.getBlockBlobClient(blobPath).setTags({ backup: 'done' });
  }
}

module.exports = {
  uploadPdf,
  generateSasUrl,
  streamDownload,
  getBlobInfo,
  runBackupOnce,
};
