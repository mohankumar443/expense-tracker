# Expense Tracker

A simple expense tracking application built with a **Spring Boot** backend and an **Angular** frontend.

## Features

- Add, edit, and delete expense entries
- View expenses in a dashboard with charts
- Persistent storage using MongoDB
- Dark/Light theme support

## Project Structure

```
Expense tracker/
├── backend/   # Spring Boot API
├── frontend/  # Angular UI
└── README.md  # This file
```

## Prerequisites

- **Java 17** (or compatible) for the backend
- **Node.js** (v18+) and **npm** for the frontend
- **MongoDB** instance running locally or remotely

## Setup

### Backend

```bash
cd "Expense tracker/backend"
./mvnw clean install
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### Frontend

```bash
cd "Expense tracker/frontend"
npm install
npm start
```

The UI will be served at `http://localhost:4200`.

## Running the Application

1. Start MongoDB.
2. Run the backend server.
3. Run the frontend development server.
4. Open your browser to `http://localhost:4200`.

## Contributing

Feel free to open issues or submit pull requests. Ensure code follows existing style conventions and includes appropriate tests.

## License

This project is licensed under the MIT License.
