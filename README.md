<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VeloCity - AI Powered Car Rental

A peer-to-peer car rental platform connecting owners and renters with AI-powered pricing analysis and smart matching.

## Project Structure

- **src/**: React Frontend application.
- **api/**: PHP Backend API (for XAMPP).
- **database/**: SQL scripts for database setup.

## Setup Instructions

### 1. Database Setup (MySQL)
1. Ensure XAMPP is running (Apache and MySQL).
2. Open phpMyAdmin (http://localhost/phpmyadmin).
3. Create a new database named `velocity_db` (or just run the script below which creates it).
4. Import the script located at `database/schema.sql` to create the tables and insert mock data.

### 2. Backend Setup
The backend files are in `api/`.
Ensure this project folder is located in `htdocs` (e.g., `C:\xampp\htdocs\velocity---ai-powered-car-rental`).
The API will be accessible at `http://localhost/velocity---ai-powered-car-rental/api/`.

### 3. Frontend Setup
1. Open a terminal in the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open the URL shown in the terminal (usually `http://localhost:5173`).

## Configuration
- The frontend connects to the backend via `src/services/api.ts`. If your folder name in `htdocs` is different, update the `API_BASE_URL` in that file.
- Gemini API Key: Set `GEMINI_API_KEY` in `.env.local` for AI features.
