# System Patterns: Razorpay Integration Architecture

## Architecture Overview

- Better Auth plugin architecture with Razorpay integration
- Database schema with subscription and user tables
- API endpoints for subscription management
- Webhook handling for real-time updates

## Tech Stack

- Better Auth framework
- Razorpay SDK
- TypeScript for type safety
- Database adapters (memory, etc.)

## Design Patterns

- Plugin pattern for Better Auth integration
- Repository pattern for database operations
- Webhook pattern for event handling
- Factory pattern for plan configuration

## Key Components

1. **Plan Configuration**: Supports both monthly and annual billing cycles
2. **Subscription Management**: Create, update, cancel operations
3. **Customer Management**: Automatic customer creation and linking
4. **Webhook Processing**: Real-time subscription status updates

## Data Flow

1. User selects plan (monthly/annual)
2. System creates Razorpay subscription
3. User completes payment via Razorpay checkout
4. Webhook updates local subscription status
5. Application reflects subscription state
