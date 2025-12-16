# SHL Assessment Recommendation Engine

## Live URLs
- Live API URL: http://localhost:3001 (Local deployment ready)
- Live Web App URL: http://localhost:3000 (Local deployment ready)  
- GitHub Repository URL: https://github.com/riyaverma/shl-assessment-engine

## Quick Start
```bash
# Install dependencies and run everything
npm install
npm run start
```

## Project Structure
```
/backend          - API server and recommendation engine
/frontend         - Web application UI (React)
/data            - Real SHL catalogue (377+ assessments) and datasets
/evaluation      - Recall@K evaluation results
/docs            - Technical approach documentation (2 pages)
/predictions     - Test set predictions (riya_verma.csv)
```

## Features Implemented
✅ **Data Pipeline**: Scraped 377+ Individual Test Solutions from SHL catalogue  
✅ **RAG Engine**: Embedding-based similarity search with balanced recommendations  
✅ **API**: Health check + recommendation endpoints (exact PDF format)  
✅ **Web App**: Functional React frontend for testing  
✅ **Evaluation**: Mean Recall@K implementation with train data  
✅ **Predictions**: Test set predictions in exact CSV format  
✅ **Documentation**: 2-page technical approach document  

## API Endpoints
- `GET /health` → `{"status": "healthy"}`
- `POST /recommend` → Returns 5-10 balanced assessment recommendations

## Dataset
- **377 Individual Test Solutions** from real SHL URLs
- **Training Data**: 10 labeled query-assessment pairs
- **Test Data**: 9 unlabeled queries for prediction
- **Evaluation**: Recall@1: 0.0000, Recall@10: 0.0500

## Requirements
- Node.js 18+
- Python 3.8+ (for initial scraping)# shl-assessment-recommender
