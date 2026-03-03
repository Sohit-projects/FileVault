# 📂 FileVault — Secure Cloud File Storage System

**Website Link - https://file-vault-l90o.onrender.com/**

FileVault is a **secure cloud-based file storage and sharing platform** that allows users to upload, manage, files efficiently.
It provides authentication, cloud storage integration, and email-based file sharing similar to modern drive systems.

---

## 🚀 Features

✅ User Authentication (Register / Login)
✅ OTP Verification
✅ Forget Password
✅ Secure File Upload & Storage
✅ Cloud Storage using Cloudinary
✅ PDF/File Preview Support
✅ Download & Access Control
✅ RESTful API Architecture
✅ Environment-based Configuration
✅ Drag & Drop Upload
✅ Frontend Dashboard

---

## 🏗️ Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Nodemailer

### Cloud & Storage

* Cloudinary (File Storage)

### Authentication & Security

* JWT Authentication
* bcrypt Password Hashing
* Environment Variables (.env)

### Tools

* Nodemon
* Git & GitHub
* Postman

---

## 📁 Project Structure

```
FileVault/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── .env
├── .gitignore
└── README.md
```

---


## ☁️ File Upload Flow

```
User → Backend API → Cloudinary Storage
                         ↓
                  File URL Stored in MongoDB
                         ↓
                  Access  / Download
```

---


## 🔐 Security Features

* Password hashing using bcrypt
* JWT-based authentication
* Protected API routes
* Secure environment configuration
* OTP vefication

---

## 🧪 Testing

Use **Postman** or frontend client to test APIs.

---

## 🌟 Future Improvements

* Role-based access control
* File expiration links
* Folder system
* File Encryption
* File Sharing


---

## 👨‍💻 Author

**Sohit Solanki**

* GitHub: https://github.com/Sohit-projects
* Project: FileVault

---

## 📄 License

This project is licensed under the MIT License.

---

⭐ If you like this project, consider giving it a star!
