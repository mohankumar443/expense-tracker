# Expense Tracker

A simple expense tracking application built with a **Spring Boot** backend and an **Angular** frontend.

## Features

- Add, edit, and delete expense entries
- View expenses in a dashboard with charts
- Persistent storage using MongoDB
- Dark/Light theme support
- Debt + Retirement modules with snapshot history and analytics

## Project Structure

```
Expense tracker/
├── backend/   # Spring Boot API
├── frontend/  # Angular UI
└── README.md  # This file
```

## Prerequisites

- **Java 17** (or compatible) for the backend
- **Node.js** (v18 LTS recommended) and **npm** for the frontend
- **MongoDB** instance running locally or remotely

### Installing MongoDB on macOS

If you don't have MongoDB installed, follow these steps:

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Add Homebrew to your PATH**:
   ```bash
   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
   eval "$(/opt/homebrew/bin/brew shellenv)"
   ```

3. **Install MongoDB Community Edition**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

4. **Start MongoDB**:
   ```bash
   brew services start mongodb-community
   ```

MongoDB will now run on `mongodb://localhost:27017` by default.

## Setup

### Backend

```bash
cd "Expense tracker/backend"
./mvnw clean install
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

### MongoDB Connection

By default, the backend connects to local MongoDB at `mongodb://localhost:27017` and uses the
database name `debt-tracker`.

To point to a different MongoDB instance, set:

```bash
export SPRING_DATA_MONGODB_URI="mongodb://<user>:<pass>@<host>:27017/debt-tracker"
```

Then start the backend. The app will read `SPRING_DATA_MONGODB_URI` if it is set.

### Frontend

```bash
cd "Expense tracker/frontend"
npm install
npm start
```

The UI will be served at `http://localhost:4200`.
If port 4200 is busy, use:
```bash
npm start -- --host 0.0.0.0 --port 4201
```

## Running the Application

1. Start MongoDB.
2. Run the backend server.
3. Run the frontend development server.
4. Open your browser to `http://localhost:4200`.

## Developer Notes

- Backend uses the Maven wrapper (`./mvnw`), so no global Maven install is required.
- Mongo connection uses `SPRING_DATA_MONGODB_URI` if set; otherwise defaults to local MongoDB.
- Snapshot-based data uses localStorage keys like `selected_snapshot_date` and `compare_snapshot_date`.
- Frontend logs: `frontend.log` (when started via nohup in this repo).
- Backend logs: `backend.log` (when started via nohup in this repo).
- Tip: If something looks off, refresh the app after a backend restart to clear stale state.

## Contributing

Feel free to open issues or submit pull requests. Ensure code follows existing style conventions and includes appropriate tests.

## License

This project is licensed under the MIT License.
