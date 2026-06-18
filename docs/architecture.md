# Architecture

## Overview

The NotebookLM Gallery uses a modern, serverless architecture built entirely on Cloudflare's free tier. This design maximizes reach while minimizing costs.

## Architecture Diagram

```
Visitor → Cloudflare CDN → Cloudflare Pages (HTML/CSS/JS)
                              │
                              ▼ (API calls from browser)
                         Cloudflare Workers (API logic)
                              │
                              ├── D1 Database (notebooks, likes)
                              └── R2 Storage (preview images)
```

## Components

### Frontend (Cloudflare Pages)
- **Purpose**: Static site serving HTML, CSS, JavaScript
- **Benefits**: Free global CDN, automatic SSL, zero server management
- **Files**: `frontend/index.html`, `frontend/notebook.html`, `frontend/submit.html`

### Backend API (Cloudflare Workers)
- **Purpose**: Serverless API handling all notebook operations
- **Benefits**: 100k free requests/day, instant global deployment
- **Key Features**:
  - RESTful API endpoints
  - Rate limiting (1 request/minute per IP)
  - Turnstile anti-abuse protection
  - CORS support for frontend

### Database (Cloudflare D1)
- **Purpose**: Persistent storage for notebook data
- **Benefits**: 5GB free, SQL-compatible, integrated with Workers
- **Schema**: Notebooks, categories, tags, likes, submission metadata

### Storage (Cloudflare R2)
- **Purpose**: Image storage for notebook preview images
- **Benefits**: 10GB free, S3-compatible, pay-as-you-go

## Data Flow

1. **Visitor** accesses the gallery via Cloudflare CDN
2. **Frontend** serves static HTML/CSS/JS from Cloudflare Pages
3. **API calls** from browser go to Cloudflare Workers
4. **Workers** query D1 database and access R2 storage
5. **Response** flows back through Cloudflare network

## Anti-Abuse

- **Turnstile**: Invisible CAPTCHA, free tier, privacy-focused
- **Rate Limiting**: 1 request/minute per IP address
- **Validation**: Server-side validation of all inputs
- **CORS**: Strict origin validation for API calls

## Scaling

- **Global Reach**: Automatic CDN distribution
- **Serverless**: Auto-scaling based on demand
- **Free Tier**: Well within free limits for typical usage
- **Performance**: Edge caching and optimized API responses

## Trade-offs

### Pros
- Zero operational costs
- Global performance
- Simple deployment
- Built-in security

### Cons
- Cold starts for Workers
- Limited database features vs. traditional databases
- No custom domain without paid plan
- Learning curve for Cloudflare ecosystem

## Development

### Local Setup
```bash
cd workers/api
wrangler dev  # API on http://localhost:8787

# Frontend (separate terminal)
cd frontend
python -m http.server 3000
```

### Testing
- **Unit Tests**: Pure function testing (validation, IP hashing)
- **Integration Tests**: Full workflow testing with Miniflare
- **Coverage**: 58 tests total covering all API endpoints

## Production

### Deployment
- **Frontend**: Cloudflare Pages automatic deployment from main branch
- **API**: Cloudflare Workers deployment via wrangler
- **Database**: Managed by Cloudflare
- **Storage**: Managed by Cloudflare

### Monitoring
- **Cloudflare Analytics**: Free usage and performance metrics
- **Workers Logs**: Real-time logging and debugging
- **D1 Analytics**: Query performance and usage patterns

## Migration Path

### From Monolith to Serverless
1. **Extract API** from existing application
2. **Set up D1** with migration script
3. **Deploy Workers** with existing business logic
4. **Redirect frontend** to new static site
5. **Monitor and optimize**

### Future Enhancements
1. **Add authentication** (paid plan required)
2. **Custom domain** (paid plan required)
3. **Advanced analytics** (paid plan required)
4. **Custom API endpoints** (free tier limitations)

## Security

### Default Security
- **WAF**: Cloudflare built-in web application firewall
- **SSL**: Automatic HTTPS for all subdomains
- **DDoS**: Built-in protection against volumetric attacks
- **Isolation**: Each Worker runs in isolated environment

### Additional Security
- **Environment Variables**: All secrets stored in Cloudflare
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Sanitization of all user inputs
- **Logging**: Audit trail of all API operations

## Cost Optimization

### Free Tier Limits
- **Workers**: 100,000 requests/day
- **D1**: 5GB storage
- **R2**: 10GB storage
- **Pages**: Static site hosting

### Monitoring Costs
- **Cloudflare Analytics**: Free, usage-based
- **Workers Analytics**: Included in free tier
- **Third-party Tools**: Optional, paid

### Optimization Strategies
1. **Cache static responses** in Cloudflare
2. **Compress images** before uploading to R2
3. **Implement CDN** for external assets
4. **Monitor usage** regularly
5. **Optimize queries** for D1 performance

## Troubleshooting

### Common Issues

#### API Not Responding
```bash
# Check Worker status
wrangler dev

# Check D1 connection
wrangler d1 execute notebooklm-marketplace --local --query "SELECT 1"
```

#### Frontend Not Loading
```bash
# Check static server
cd frontend
python -m http.server 3000

# Verify API endpoint
curl http://localhost:8787/api/notebooks
```

#### Turnstile Issues
```bash
# Check environment variables
ls workers/api/.env
ls frontend/.env
```

### Debugging

#### Worker Logs
```bash
wrangler dev --log-level info
```

#### Browser DevTools
- **Network**: Check API calls and responses
- **Console**: Look for JavaScript errors
- **Sources**: Debug worker code

#### Database Issues
```bash
# Check database migrations
wrangler d1 migrations apply notebooklm-marketplace --local

# Backup data
wrangler d1 export notebooklm-marketplace --local
```

## Conclusion

This architecture provides a powerful, cost-effective solution for hosting a notebook gallery. By leveraging Cloudflare's serverless platform, we achieve global reach with minimal operational overhead. The design is scalable, secure, and optimized for the free tier limits.

Key advantages:
- **Zero operational costs** for typical usage
- **Global performance** through CDN
- **Built-in security** and anti-abuse measures
- **Simple deployment** and maintenance
- **Scalable architecture** for future growth

The NotebookLM Gallery demonstrates how modern serverless architectures can solve complex problems while keeping costs low and performance high.