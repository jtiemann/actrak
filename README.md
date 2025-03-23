# Activity Tracker Application

A component-based Node.js application for tracking activities, goals, and achievements with a central event bus architecture.

## Architecture Overview

This application uses a component-based architecture with a central event bus for communication between components. This design provides several benefits:

- **Loose Coupling**: Components communicate through events rather than direct method calls
- **Modularity**: Each component can be developed, tested, and maintained independently
- **Testability**: Components can be tested in isolation with mocked dependencies
- **Extensibility**: New features can be added as new components without modifying existing code
- **Maintainability**: Clear separation of concerns makes the codebase easier to understand and maintain

### Core Components

- **EventBus**: Central hub for application-wide communication
- **Component**: Base class that all components inherit from
- **Orchestrator**: Manages component lifecycle, initialization order, and dependencies
- **ConfigManager**: Centralizes configuration from multiple sources

### Application Components

- **Database**: Handles database connections and operations
- **Auth**: Manages user authentication, token validation, and authorization
- **Activity**: Handles tracking of user activities and logs
- **Goal**: Manages user goals and goal progress
- **Achievement**: Handles user achievements and badges
- **Notification**: Manages email notifications, reminders, and reports
- **Analytics**: Provides data analysis and reporting capabilities

## Directory Structure

```
src/
├── core/                  # Core framework components
│   ├── event-bus.js       # Central event bus
│   ├── component-class.js # Base Component class
│   ├── orchestrator.js    # Application orchestrator
│   └── config-manager.js  # Configuration management
│
├── components/            # Application components
│   ├── auth/              # Authentication component
│   ├── activities/        # Activities management component
│   ├── goals/             # Goals tracking component
│   ├── achievements/      # Achievements component
│   ├── notifications/     # Notification services component
│   ├── analytics/         # Data analytics component
│   └── database/          # Database component
│
├── shared/                # Shared resources
│   ├── middlewares/       # Express middlewares
│   ├── routes/            # API routes
│   ├── models/            # Shared data models
│   ├── utils/             # Shared utility functions
│   └── database/          # Database utilities
│
└── app.js                 # Main application entry point
```

## Getting Started

### Prerequisites

- Node.js v14+
- PostgreSQL v12+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `config.env`
4. Run database setup scripts:
   ```bash
   node setup.js
   ```
5. Start the application:
   ```bash
   npm start
   ```

## Development

### Adding a New Component

1. Create a new component class that extends the base `Component` class
2. Register the component in `app.js`
3. Define event handlers in the `registerEvents` method
4. Implement component-specific initialization in the `_init` method

### Component Communication

Components communicate through events rather than direct method calls:

```javascript
// Publishing an event
this.publish('user:created', {
  userId: user.id,
  timestamp: new Date()
});

// Subscribing to an event
this.subscribe('user:created', this._handleUserCreated.bind(this));
```

## API Documentation

API endpoints are organized by resource:

- `/api/auth`: Authentication endpoints
- `/api/activities`: Activity management
- `/api/logs`: Activity logging
- `/api/goals`: Goal management
- `/api/achievements`: Achievement system
- `/api/analytics`: Data analytics and reporting

## License

This project is licensed under the MIT License.
