# API Documentation

## Overview

The NotebookLM Gallery API provides a RESTful interface for managing notebooks, categories, and tags. Built with Cloudflare Workers, the API offers 100k free requests per day with global CDN distribution.

## API Base URL

```
https://api.notebooklm.gallery
```

## Authentication

The API uses **no authentication** by default. All endpoints are publicly accessible. For production deployment, consider adding API key authentication.

## Rate Limiting

- **Limit**: 1 request per minute per IP address
- **Reset**: Rate limit resets every hour
- **Response**: `429 Too Many Requests` when limit exceeded

## API Endpoints

### GET `/api/notebooks`

List all notebooks with pagination and filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (starts at 1) |
| `limit` | integer | No | Items per page (max 50) |
| `category` | string | No | Filter by category |
| `tag` | string | No | Filter by tag |
| `search` | string | No | Search in title and description |

#### Response

```json
{
  "notebooks": [
    {
      "id": "uuid-string",
      "title": "Notebook Title",
      "description": "Notebook description",
      "url": "https://example.com",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "categories": ["tech", "education"],
      "tags": ["ai", "ml"],
      "likes": 42,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### GET `/api/notebooks/:id`

Get a specific notebook by ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notebook ID (UUID) |

#### Response

```json
{
  "id": "uuid-string",
  "title": "Notebook Title",
  "description": "Notebook description",
  "url": "https://example.com",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "categories": ["tech", "education"],
  "tags": ["ai", "ml"],
  "likes": 42,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "submitters": [
    {
      "id": "user-uuid",
      "name": "Submitter Name",
      "email": "submitter@example.com"
    }
  ]
}
```

### POST `/api/notebooks`

Submit a new notebook to the gallery.

#### Request Body

```json
{
  "title": "Notebook Title",
  "description": "Notebook description",
  "url": "https://example.com",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "categories": ["tech", "education"],
  "tags": ["ai", "ml"]
}
```

#### Required Fields

- `title`: Notebook title (max 200 characters)
- `description`: Notebook description (max 1000 characters)
- `url`: Valid URL to the notebook
- `categories`: Array of category names
- `tags`: Array of tag names

#### Optional Fields

- `thumbnail`: URL to thumbnail image

#### Response

```json
{
  "success": true,
  "id": "uuid-string",
  "message": "Notebook submitted successfully"
}
```

#### Error Responses

```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    "Title is required",
    "URL must be valid",
    "Categories must include at least one"
  ]
}
```

### POST `/api/notebooks/:id/like`

Toggle like status for a notebook.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notebook ID (UUID) |

#### Response

```json
{
  "success": true,
  "liked": true,
  "likes": 42
}
```

### GET `/api/categories`

List all categories with notebook counts.

#### Response

```json
{
  "categories": [
    {
      "name": "tech",
      "count": 45,
      "description": "Technology-related notebooks"
    },
    {
      "name": "education",
      "count": 32,
      "description": "Educational notebooks"
    }
  ]
}
```

### GET `/api/tags/trending`

List trending tags based on popularity.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Number of tags to return (max 20) |

#### Response

```json
{
  "tags": [
    {
      "name": "ai",
      "count": 128,
      "trend": "up"
    },
    {
      "name": "ml",
      "count": 95,
      "trend": "stable"
    }
  ]
}
```

## API Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": ["Additional error details"]
}
```

## API Testing

### Local Testing

```bash
# Test API locally
curl http://localhost:8787/api/notebooks

# Submit a notebook
curl -X POST http://localhost:8787/api/notebooks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test description","url":"https://example.com","categories":["tech"],"tags":["test"]}'
```

### Integration Testing

The API is tested with comprehensive integration tests covering:

- **Submission flow**: Complete notebook submission process
- **CAPTCHA validation**: Turnstile integration
- **Rate limiting**: Request throttling
- **Data validation**: Input validation
- **CORS support**: Cross-origin requests

## API Security

### Security Measures

1. **Rate Limiting**: 1 request/minute per IP
2. **Input Validation**: Server-side validation of all inputs
3. **Turnstile**: CAPTCHA protection for submissions
4. **CORS**: Strict origin validation
5. **Logging**: Audit trail of all API operations

### Security Headers

The API includes the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## API Performance

### Response Times

- **Average**: < 200ms
- **P95**: < 500ms
- **P99**: < 1s

### Caching

- **CDN Caching**: Cloudflare CDN provides edge caching
- **Browser Caching**: Appropriate cache headers for static responses
- **API Response Caching**: Internal caching for frequently accessed data

## API Monitoring

### Metrics

- **Request Count**: Total API requests
- **Response Time**: Average and percentile response times
- **Error Rate**: Percentage of failed requests
- **Rate Limit Usage**: Rate limit consumption
- **Data Volume**: Bytes transferred

### Monitoring Tools

- **Cloudflare Analytics**: Free usage and performance metrics
- **Workers Logs**: Real-time logging and debugging
- **D1 Analytics**: Query performance and usage patterns

## API Versioning

### Current Version

- **Version**: v1
- **Status**: Stable
- **Breaking Changes**: None planned

### Future Versions

- **v2**: Planned with authentication and additional features
- **Migration**: Backward-compatible changes only
- **Deprecation**: 12-month deprecation policy for breaking changes

## API Documentation Updates

### Documentation Format

This documentation is generated from code comments and API specifications. Updates should be made in:

- **Code comments**: Inline documentation
- **API specifications**: OpenAPI/Swagger files
- **README files**: High-level API documentation

### Contribution Guidelines

- **Update examples**: Keep examples current
- **Document errors**: Document all error cases
- **Update responses**: Update response formats
- **Review changes**: Review all API documentation changes

## API Development

### Development Workflow

1. **Make changes** to API code in `workers/api/src/`
2. **Run tests** locally with `npm test`
3. **Test API** with curl or browser
4. **Update documentation** as needed
5. **Commit changes** with conventional commits

### Code Standards

- **ESLint**: Follow JavaScript linting rules
- **Prettier**: Use consistent code formatting
- **Tests**: Write comprehensive tests
- **Documentation**: Update API documentation
- **Comments**: Add inline comments for complex logic

### API Testing Best Practices

#### Unit Test Practices

- **Test validation functions** thoroughly
- **Test business logic** in isolation
- **Mock external dependencies**
- **Cover edge cases**

#### Integration Test Practices

- **Test complete workflows**
- **Mock Cloudflare services**
- **Test error scenarios**
- **Verify API responses**

## API Conclusion

The NotebookLM Gallery API provides a robust, scalable interface for managing notebooks. With comprehensive error handling, security measures, and performance optimizations, the API ensures reliable operation.

Key API features:
- **RESTful design** with clear endpoints
- **Comprehensive validation** with detailed error messages
- **Security measures** including rate limiting and CAPTCHA
- **Performance optimizations** with caching and CDN
- **Testing coverage** with 58 tests total
- **Monitoring tools** for production visibility

The API is designed for:
- **Ease of use** with clear documentation and examples
- **Reliability** with comprehensive testing and error handling
- **Security** with built-in protections
- **Performance** with caching and optimization
- **Maintainability** with clear code standards

This API documentation provides everything needed to work with the NotebookLM Gallery API, from basic usage to advanced development and troubleshooting.