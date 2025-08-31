const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require('@azure/storage-blob');
const logger = require('../utils/logger');

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'receipts';
const backupContainerName = process.env.AZURE_BACKUP_CONTAINER || 'receipts-backup';
const permanentPolicyId = process.env.PERMANENT_SAS_POLICY_ID || 'permanent-read';

let serviceClient;
if (connStr) {
  serviceClient = BlobServiceClient.fromConnectionString(connStr);
} else if (accountName && accountKey) {
  const cred = new StorageSharedKeyCredential(accountName, accountKey);
  serviceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, cred);
} else {
  throw new Error('Azure credentials missing. Set AZURE_STORAGE_CONNECTION_STRING or account name/key.');
}

const containerClient = serviceClient.getContainerClient(containerName);
const backupContainerClient = serviceClient.getContainerClient(backupContainerName);

async function ensureContainers() {
  const res1 = await containerClient.createIfNotExists();
  if (res1.succeeded) logger.info(`Created container: ${containerName}`);
  const res2 = await backupContainerClient.createIfNotExists();
  if (res2.succeeded) logger.info(`Created container: ${backupContainerName}`);
}

// Create/ensure a Stored Access Policy on the receipts container for permanent read SAS
async function ensurePermanentPolicyIfNeeded() {
  if (!permanentPolicyId) return;
  try {
    const get = await containerClient.getAccessPolicy();
    const policies = get.signedIdentifiers || [];
    const exists = policies.find(p => p.id === permanentPolicyId);
    if (!exists) {
      // No expiry → revocable by deleting this policy later
      policies.push({ id: permanentPolicyId, accessPolicy: { permissions: 'r' } });
      await containerClient.setAccessPolicy(undefined, policies);
      logger.info(`Created stored access policy '${permanentPolicyId}'.`);
    } else {
      logger.info(`Stored access policy '${permanentPolicyId}' exists.`);
    }
  } catch (e) {
    logger.warn('Could not ensure stored access policy (non-fatal): ' + e.message);
  }
}

module.exports = {
  serviceClient,
  containerClient,
  backupContainerClient,
  ensureContainers,
  ensurePermanentPolicyIfNeeded,
  permanentPolicyId,
};
