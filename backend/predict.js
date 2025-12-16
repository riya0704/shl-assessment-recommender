const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { createReadStream } = require('fs');
const RecommendationEngine = require('./recommendation-engine');

class PredictionSystem {
  constructor() {
    this.engine = new RecommendationEngine();
    this.testData = [];
  }

  async initialize() {
    await this.engine.initialize();
    await this.loadTestData();
  }

  async loadTestData() {
    return new Promise((resolve, reject) => {
      const testPath = path.join(__dirname, '../data/test_data.csv');
      const results = [];
      
      createReadStream(testPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.testData = results;
          console.log(`Loaded ${this.testData.length} test samples`);
          resolve();
        })
        .on('error', reject);
    });
  }

  async generatePredictions() {
    console.log('Generating predictions for test dataset...');
    
    const predictions = [];
    
    for (let i = 0; i < this.testData.length; i++) {
      const sample = this.testData[i];
      const query = sample.Query || sample.query;
      
      if (!query) {
        console.warn(`No query found for sample ${i}`);
        continue;
      }
      
      try {
        const recommendations = await this.engine.getRecommendations(query);
        
        // Get top recommendation URL
        const topRecommendation = recommendations[0];
        const assessmentUrl = topRecommendation ? topRecommendation.url : '';
        
        predictions.push({
          Query: query,
          Assessment_url: assessmentUrl
        });
        
        if (i % 10 === 0) {
          console.log(`Generated predictions for ${i + 1}/${this.testData.length} samples`);
        }
        
      } catch (error) {
        console.error(`Error generating prediction for sample ${i}:`, error.message);
        
        // Add empty prediction to maintain order
        predictions.push({
          Query: query,
          Assessment_url: ''
        });
      }
    }
    
    return predictions;
  }

  async savePredictions(predictions) {
    const outputPath = path.join(__dirname, '../predictions/riya_verma.csv');
    
    // Ensure predictions directory exists
    const predDir = path.dirname(outputPath);
    await fs.mkdir(predDir, { recursive: true });
    
    // Create CSV content manually to handle commas properly
    const csvContent = [
      'Query,Assessment_url',
      ...predictions.map(pred => {
        // Properly escape commas in queries
        const escapedQuery = `"${pred.Query.replace(/"/g, '""')}"`;
        return `${escapedQuery},${pred.Assessment_url}`;
      })
    ].join('\n');
    
    await fs.writeFile(outputPath, csvContent);
    console.log(`Predictions saved to ${outputPath}`);
    
    // Validate output format
    await this.validatePredictions(outputPath);
    
    return outputPath;
  }

  async validatePredictions(filePath) {
    console.log('Validating prediction file format...');
    
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Check header
    const header = lines[0];
    if (header !== 'Query,Assessment_url') {
      throw new Error(`Invalid header format. Expected: "Query,Assessment_url", Got: "${header}"`);
    }
    
    // Check data rows - use proper CSV parsing for validation
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple validation - check if line has quoted query and URL
      if (!line.includes('"') || !line.includes('https://')) {
        console.warn(`Warning: Line ${i + 1} may have formatting issues: ${line}`);
      }
    }
    
    console.log(`✓ Prediction file format validated: ${lines.length - 1} predictions`);
  }

  async runPrediction() {
    console.log('Running prediction pipeline...');
    
    try {
      await this.initialize();
      const predictions = await this.generatePredictions();
      const outputPath = await this.savePredictions(predictions);
      
      console.log('\n=== PREDICTION COMPLETE ===');
      console.log(`Generated ${predictions.length} predictions`);
      console.log(`Output file: ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw error;
    }
  }
}

// Run prediction if called directly
if (require.main === module) {
  const predictor = new PredictionSystem();
  predictor.runPrediction()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Prediction failed:', error);
      process.exit(1);
    });
}

module.exports = PredictionSystem;