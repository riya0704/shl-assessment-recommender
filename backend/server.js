const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const RecommendationEngine = require('./recommendation-engine');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Initialize recommendation engine
const engine = new RecommendationEngine();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Assessment recommendation endpoint
app.post('/recommend', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required and must be a string'
      });
    }

    const recommendations = await engine.getRecommendations(query);
    
    res.json({
      recommended_assessments: recommendations
    });
    
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Serve frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Initialize engine and start server
async function startServer() {
  try {
    console.log('Initializing recommendation engine...');
    await engine.initialize();
    console.log('Recommendation engine initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoint: http://localhost:${PORT}/recommend`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();