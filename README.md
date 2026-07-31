# Sales CRM Application

A responsive full-stack Sales CRM built with React and Express. The app includes authentication, RBAC, contact upload/parsing, assignment, dashboards, search, filters, pagination, and feedback flows.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```
3. Open the frontend at http://localhost:5173 and the backend at http://localhost:5000.

## Default Login

- Phone: 9999999999
- Password: admin123

## Notes

- The backend stores data locally by default and uses AWS S3/DynamoDB if environment variables are provided.
- Configure your AWS credentials in a .env file if you want to switch from the local fallback to cloud storage.
