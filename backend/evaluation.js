const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const RecommendationEngine = require('./recommendation-engine');

class EvaluationSystem {
  constructor() {
    this.engine = new RecommendationEngine();
    this.trainData = [];
    this.testData = [];
  }

  async initialize() {
    await this.engine.initialize();
    await this.loadTrainData();
    await this.loadTestData();
  }

  async loadTrainData() {
    return new Promise((resolve, reject) => {
      const trainPath = path.join(__dirname, '../data/train_data.csv');
      const results = [];
      
      createReadStream(trainPath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.trainData = results;
          console.log(`Loaded ${this.trainData.length} training samples`);
          resolve();
        })
        .on('error', reject);
    });
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

  async evaluateRecall() {
    console.log('Starting Recall@K evaluation...');
    
    const k_values = [1, 3, 5, 10];
    const results = {};
    
    for (const k of k_values) {
      const recalls = [];
      
      for (let i = 0; i < this.trainData.length; i++) {
        const sample = this.trainData[i];
        const query = sample.Query || sample.query;
        const relevantUrls = this.parseRelevantUrls(sample);
        
        if (!query || relevantUrls.length === 0) continue;
        
        try {
          const recommendations = await this.engine.getRecommendations(query);
          const recommendedUrls = recommendations.slice(0, k).map(rec => rec.url);
          
          const recall = this.calculateRecall(relevantUrls, recommendedUrls);
          recalls.push(recall);
          
          if (i % 10 === 0) {
            console.log(`Evaluated ${i + 1}/${this.trainData.length} samples for k=${k}`);
          }
        } catch (error) {
          console.error(`Error evaluating sample ${i}:`, error.message);
        }
      }
      
      const meanRecall = recalls.length > 0 ? recalls.reduce((sum, r) => sum + r, 0) / recalls.length : 0;
      results[`recall_at_${k}`] = {
        mean: meanRecall,
        samples: recalls.length,
        individual_scores: recalls
      };
      
      console.log(`Recall@${k}: ${meanRecall.toFixed(4)} (${recalls.length} samples)`);
    }
    
    // Save evaluation results
    await this.saveEvaluationResults(results);
    
    return results;
  }

  parseRelevantUrls(sample) {
    // Parse relevant assessment URLs from training data
    const urlFields = ['Assessment_url', 'assessment_url', 'url', 'relevant_urls'];
    const urls = [];
    
    for (const field of urlFields) {
      if (sample[field]) {
        const fieldUrls = sample[field].split(',').map(url => url.trim()).filter(url => url);
        urls.push(...fieldUrls);
      }
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }

  calculateRecall(relevantUrls, recommendedUrls) {
    if (relevantUrls.length === 0) return 0;
    
    const relevantSet = new Set(relevantUrls);
    const retrievedRelevant = recommendedUrls.filter(url => relevantSet.has(url));
    
    return retrievedRelevant.length / relevantUrls.length;
  }

  async saveEvaluationResults(results) {
    const resultsPath = path.join(__dirname, '../evaluation/recall_results.json');
    
    // Ensure evaluation directory exists
    const evalDir = path.dirname(resultsPath);
    await fs.mkdir(evalDir, { recursive: true });
    
    // Add metadata
    const fullResults = {
      timestamp: new Date().toISOString(),
      evaluation_type: 'Mean Recall@K',
      dataset_size: this.trainData.length,
      results: results,
      summary: {
        recall_at_1: results.recall_at_1?.mean || 0,
        recall_at_3: results.recall_at_3?.mean || 0,
        recall_at_5: results.recall_at_5?.mean || 0,
        recall_at_10: results.recall_at_10?.mean || 0
      }
    };
    
    await fs.writeFile(resultsPath, JSON.stringify(fullResults, null, 2));
    console.log(`Evaluation results saved to ${resultsPath}`);
    
    // Also save a summary CSV
    const summaryPath = path.join(__dirname, '../evaluation/recall_summary.csv');
    const csvContent = [
      'Metric,Value',
      `Recall@1,${fullResults.summary.recall_at_1}`,
      `Recall@3,${fullResults.summary.recall_at_3}`,
      `Recall@5,${fullResults.summary.recall_at_5}`,
      `Recall@10,${fullResults.summary.recall_at_10}`,
      `Dataset Size,${fullResults.dataset_size}`,
      `Evaluation Date,${fullResults.timestamp}`
    ].join('\n');
    
    await fs.writeFile(summaryPath, csvContent);
    console.log(`Summary saved to ${summaryPath}`);
  }

  async runFullEvaluation() {
    console.log('Running full evaluation pipeline...');
    
    try {
      await this.initialize();
      const results = await this.evaluateRecall();
      
      console.log('\n=== EVALUATION COMPLETE ===');
      console.log(`Recall@1:  ${results.recall_at_1?.mean.toFixed(4) || 'N/A'}`);
      console.log(`Recall@3:  ${results.recall_at_3?.mean.toFixed(4) || 'N/A'}`);
      console.log(`Recall@5:  ${results.recall_at_5?.mean.toFixed(4) || 'N/A'}`);
      console.log(`Recall@10: ${results.recall_at_10?.mean.toFixed(4) || 'N/A'}`);
      
      return results;
    } catch (error) {
      console.error('Evaluation failed:', error);
      throw error;
    }
  }
}

// Run evaluation if called directly
if (require.main === module) {
  const evaluator = new EvaluationSystem();
  evaluator.runFullEvaluation()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Evaluation failed:', error);
      process.exit(1);
    });
}

module.exports = EvaluationSystem;