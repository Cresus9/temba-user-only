# AfriTix API Documentation

## Base URL
```
https://api.afritix.com
```

For development: `http://localhost:3000`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
```

Request body:
```json
{
  "email": "string",
  "password": "string"
}
```

Response:
```json
{
  "access_token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "USER" | "ADMIN"
  }
}
```

#### Register
```http
POST /api/auth/register
```

Request body:
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "phone": "string (optional)"
}
```

Response: Same as login

## Events

### Get All Events
```http
GET /api/events
```

Query parameters:
- `featured` (boolean): Filter featured events
- `category` (string): Filter by category
- `status` (string): Filter by status

Response:
```json
[
  {
    "id": "string",
    "title": "string",
    "description": "string",
    "date": "string",
    "time": "string",
    "location": "string",
    "imageUrl": "string",
    "price": "number",
    "currency": "string",
    "capacity": "number",
    "ticketsSold": "number",
    "status": "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED",
    "featured": "boolean",
    "categories": "string[]",
    "ticketTypes": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "price": "number",
        "quantity": "number",
        "available": "number",
        "maxPerOrder": "number"
      }
    ]
  }
]
```

### Get Event by ID
```http
GET /api/events/{id}
```

Response: Single event object

### Create Event (Admin)
```http
POST /api/events
```

Request body:
```json
{
  "title": "string",
  "description": "string",
  "date": "string",
  "time": "string",
  "location": "string",
  "imageUrl": "string",
  "price": "number",
  "currency": "string",
  "capacity": "number",
  "categories": "string[]",
  "ticketTypes": [
    {
      "name": "string",
      "description": "string",
      "price": "number",
      "quantity": "number",
      "maxPerOrder": "number"
    }
  ]
}
```

## Orders

### Create Order
```http
POST /api/orders
```

Request body:
```json
{
  "eventId": "string",
  "tickets": [
    {
      "ticketTypeId": "string",
      "quantity": "number"
    }
  ],
  "paymentMethod": "string"
}
```

### Get User Orders
```http
GET /api/orders/user
```

Response:
```json
[
  {
    "id": "string",
    "total": "number",
    "status": "PENDING" | "COMPLETED" | "CANCELLED",
    "event": {
      "title": "string",
      "date": "string",
      "time": "string",
      "location": "string"
    },
    "tickets": [
      {
        "id": "string",
        "ticketType": {
          "name": "string",
          "price": "number"
        }
      }
    ]
  }
]
```

## Support

### Create Support Ticket
```http
POST /api/support/tickets
```

Request body:
```json
{
  "subject": "string",
  "message": "string",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "categoryId": "string"
}
```

### Get User Tickets
```http
GET /api/support/tickets
```

Response:
```json
[
  {
    "id": "string",
    "subject": "string",
    "status": "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "categoryName": "string",
    "messageCount": "number",
    "createdAt": "string",
    "lastReplyAt": "string"
  }
]
```

### Add Message to Ticket
```http
POST /api/support/tickets/{ticketId}/messages
```

Request body:
```json
{
  "message": "string"
}
```

## Notifications

### Get User Notifications
```http
GET /api/notifications
```

Query parameters:
- `read` (boolean): Filter by read status
- `type` (string): Filter by notification type

Response:
```json
[
  {
    "id": "string",
    "title": "string",
    "message": "string",
    "type": "string",
    "read": "boolean",
    "createdAt": "string"
  }
]
```

### Update Notification Preferences
```http
PUT /api/notifications/preferences
```

Request body:
```json
{
  "email": "boolean",
  "push": "boolean",
  "types": "string[]"
}
```

## Analytics (Admin)

### Get Dashboard Stats
```http
GET /api/analytics/dashboard
```

Response:
```json
{
  "totalUsers": "number",
  "totalEvents": "number",
  "totalRevenue": "number",
  "ticketsSold": "number",
  "userGrowth": [
    {
      "date": "string",
      "value": "number"
    }
  ],
  "salesByCategory": [
    {
      "category": "string",
      "total": "number"
    }
  ]
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "string",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1623456789
```

## Websocket Events

Connect to websocket at: `wss://api.afritix.com/socket.io`

### Events
- `notification` - New notification
- `eventUpdate` - Event details updated
- `ticketUpdate` - Ticket availability updated
- `chatMessage` - New chat message

### Example:
```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```