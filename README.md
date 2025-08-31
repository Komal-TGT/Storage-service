# Storage Service (MS4)

## 📌 Overview
The **Storage Service** is responsible for securely storing receipt PDFs in **Azure Blob Storage**.  
It provides REST APIs to upload, retrieve, and generate signed URLs (temporary or permanent).  
Additionally, it includes a backup job to ensure redundancy and compliance.

---

## 🚀 Features
- 📂 Upload receipt PDFs with structured folder paths (`client/date/pos/filename`)
- 🔑 API Key authentication for endpoints
- 🔒 Encrypted storage in Azure Blob (default server-side encryption)
- ⏳ Expiring signed URLs for secure sharing
- ♾ Permanent signed URLs (via stored access policy)
- 📦 Automatic redundancy/compliance backup (hourly job)
- 🛠 Configurable via `.env`

---

## 🏗 Tech Stack
- **Node.js**
- **Express.js**
- **Azure Blob Storage SDK** (`@azure/storage-blob`)
- **Multer** for file handling
- **Node-Cron** for scheduled backups

---

## 📁 Project Structure
```
.
├── .env                     # Environment variables
├── package.json             # Dependencies & scripts
├── README.md                # Project documentation
├── README-API.http          # Example API requests
└── src
    ├── index.js             # Entry point
    ├── config/azure.js      # Azure Blob client setup
    ├── controllers/storage.controller.js # Upload & URL logic
    ├── jobs/backup.job.js   # Backup job for redundancy
    ├── middleware/auth.js   # API key authentication
    ├── routes/storage.routes.js # REST API routes
    ├── services/blob.service.js # Blob storage service functions
    └── utils/logger.js      # Logger utility
```

---

## ⚙️ Setup & Installation

### 1️⃣ Clone Repository
```bash
git clone <repo-url>
cd Storage-service
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables
Create a `.env` file in root:
```env
PORT=4004
API_KEY=your_api_key_here

AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER=receipts
AZURE_BACKUP_CONTAINER=receipts-backup
```

### 4️⃣ Run Service
```bash
npm start
```

The service will run on **http://localhost:4004**

---

## 🔌 API Endpoints

### 🔑 Authentication
All requests require a header:
```
x-api-key: your_api_key_here
```

### 1. Upload Receipt PDF
```http
POST /storage/upload
Content-Type: multipart/form-data
x-api-key: your_api_key_here

Body:
- file (PDF)
- clientId
- posId
- date (YYYY-MM-DD)
```

### 2. Generate Expiring Signed URL
```http
GET /storage/signed-url/:clientId/:date/:posId/:filename?expiryMinutes=60
x-api-key: your_api_key_here
```

### 3. Generate Permanent Signed URL
```http
GET /storage/permanent-url/:clientId/:date/:posId/:filename
x-api-key: your_api_key_here
```

### 4. Trigger Backup (manual)
```http
POST /storage/backup
x-api-key: your_api_key_here
```

---

## 🛡 Security
- **Encryption**: Azure Blob Storage provides server-side encryption (AES-256).
- **Access**: Only via signed URLs or authenticated API requests.
- **Backup Policy**: Redundant copies in a backup container, with hourly scheduled job.

---

## 📝 Compliance
- Folder structure ensures **traceability per client/date/POS**
- Backups stored in **separate container** for redundancy
- Can integrate with **Azure Event Grid** for real-time compliance

---

## 🤝 Future Enhancements
- ✅ JWT or Azure AD authentication instead of static API Key
- ✅ Real-time backup with Azure Event Grid
- ✅ Virus scanning before upload
- ✅ Automated retention policies

---

Created by KOMAL RANI 💻
🔗 GitHub: github.com/ Komal-TGT

Developed as **Microservice 4 (MS4)** in the Receipt Management System.

