# 🎓 University LMS - Learning Management System

A modern, comprehensive Learning Management System built for universities to streamline academic operations and enhance student-institution interactions.

<div align="center">
  
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=flat-square&logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-FFCA28?style=flat-square&logo=firebase&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-94.3%-F7DF1E?style=flat-square&logo=javascript&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-5.5%-1572B6?style=flat-square&logo=css3&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)

</div>

---

## 📋 Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Roles](#user-roles)
- [Core Modules](#core-modules)
- [Key Features Breakdown](#key-features-breakdown)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 🎯 Core Functionality

- **Dual Role System**: Separate interfaces for Students and Administrators
- **Role-Based Access Control**: Secure, protected routes based on user authentication
- **Real-time Data Synchronization**: Firebase integration for live updates
- **Session-Based Authentication**: Secure session management with automatic logout
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI/UX**: Clean, intuitive interface built with React components

### 👨‍🎓 Student Portal

- **Dashboard**: Personalized academic overview and quick access to key information
- **Profile Management**: View and manage personal and academic details
- **Course Management**: Browse enrolled courses with faculty information
- **Attendance Tracking**: Subject-wise attendance records and statistics
- **Results & Grades**: View semester performance and cumulative GPA
- **Fee Management**: Invoice tracking, payment history, and late fee calculations
- **Timetable**: Personalized class schedule and room allocations
- **Transcript**: Academic records and certification documents

### 👨‍💼 Administrator Portal

- **Dashboard**: System-wide analytics and key performance indicators
- **Student Management**: Add, update, and manage student records and enrollments
- **Course Management**: Create and manage courses with faculty assignments
- **Attendance Management**: Track and manage class attendance records
- **Results Management**: Input and manage student grades and results
- **Fee Management**: Configure fee structures and track payments
- **Timetable Management**: Create and manage class schedules and allocations

---

## 📸 Screenshots

### Welcome & Login Interface
<div align="center">
  <img src="./src/assets/lms11.png" alt="Welcome & Login Screen" width="85%" />
  <p><em>Figure 1: Welcome and Login Interface</em></p>
</div>

### Dashboard Overview
<div align="center">
  <img src="./src/assets/lms2.png" alt="Dashboard Overview" width="85%" />
  <p><em>Figure 2: Main Dashboard Overview</em></p>
</div>

### Features & Management Interface
<div align="center">
  <img src="./src/assets/lms3.png" alt="Features & Management" width="85%" />
  <p><em>Figure 3: Features and Management Interface</em></p>
</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18+ | UI library and component management |
| **Build Tool** | Vite | Fast build tooling and dev server |
| **Routing** | React Router v6 | Client-side navigation and routing |
| **Backend/Database** | Firebase Firestore | Real-time NoSQL database |
| **Authentication** | Firebase Auth | Secure user authentication |
| **Icons** | Lucide React | Modern, customizable icons |
| **Styling** | CSS3 | Custom styling and responsive design |
| **Language** | JavaScript (ES6+) | Core application language |

---

## 📁 Project Structure

```
college-lms/
├── src/
│   ├── assets/              # Static images and media files
│   │   ├── lms11.png        # Welcome & Login Screen
│   │   ├── lms2.png         # Dashboard Overview
│   │   └── lms3.png         # Features & Management Interface
│   ├── components/          # Reusable React components
│   ├── pages/               # Page components
│   ├── utils/               # Utility functions
│   ├── styles/              # Global stylesheets
│   ├── firebase/            # Firebase configuration
│   ├── App.jsx              # Main App component
│   └── main.jsx             # Entry point
├── public/                  # Static public assets
├── package.json             # Project dependencies
├── vite.config.js           # Vite configuration
├── index.html               # HTML template
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn package manager
- Firebase account for backend setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/wasiakbar8/college-lms.git
   cd college-lms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase credentials**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Add your Firebase configuration to the project

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

---

## 👥 User Roles

### Student
- View personal academic information
- Track attendance and grades
- Access course materials
- Manage fee payments
- View class schedule

### Administrator
- Manage student records
- Create and assign courses
- Monitor system analytics
- Manage fee structures
- Oversee attendance records

---

## 🔐 Authentication

The LMS uses **Firebase Authentication** to ensure secure access:

- Email/Password authentication
- Role-based access control (RBAC)
- Session-based authentication with auto-logout
- Protected routes based on user roles

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support

For support, please open an issue in the [GitHub repository](https://github.com/wasiakbar8/college-lms/issues).

---

<div align="center">
  <p><strong>Made with ❤️ by wasiakbar8</strong></p>
</div>
