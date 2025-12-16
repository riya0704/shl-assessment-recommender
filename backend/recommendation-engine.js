const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class RecommendationEngine {
  constructor() {
    this.assessments = [];
    this.embeddings = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Load assessment data
      await this.loadAssessments();
      
      // Generate embeddings for all assessments
      await this.generateEmbeddings();
      
      this.initialized = true;
      console.log(`Recommendation engine initialized with ${this.assessments.length} assessments`);
    } catch (error) {
      console.error('Failed to initialize recommendation engine:', error);
      throw error;
    }
  }

  async loadAssessments() {
    try {
      const dataPath = path.join(__dirname, '../data/shl_assessments.json');
      const data = await fs.readFile(dataPath, 'utf8');
      this.assessments = JSON.parse(data);
      
      if (this.assessments.length < 377) {
        throw new Error(`Insufficient assessments: ${this.assessments.length} < 377 required`);
      }
      
      console.log(`Loaded ${this.assessments.length} assessments`);
    } catch (error) {
      console.error('Error loading assessments:', error);
      throw error;
    }
  }

  async generateEmbeddings() {
    console.log('Generating embeddings for assessments...');
    
    for (let i = 0; i < this.assessments.length; i++) {
      const assessment = this.assessments[i];
      const text = this.createEmbeddingText(assessment);
      const embedding = await this.getEmbedding(text);
      this.embeddings.set(i, embedding);
      
      if (i % 50 === 0) {
        console.log(`Generated embeddings for ${i + 1}/${this.assessments.length} assessments`);
      }
    }
    
    console.log('Embedding generation complete');
  }

  createEmbeddingText(assessment) {
    const testTypes = Array.isArray(assessment.test_type) 
      ? assessment.test_type.join(' ') 
      : assessment.test_type || '';
    
    return `${assessment.name} ${assessment.description} ${testTypes} ${assessment.adaptive_support} ${assessment.remote_support}`;
  }

  async getEmbedding(text) {
    // Simple embedding simulation using text characteristics
    // In production, use OpenAI embeddings or similar
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    
    // Create embedding based on text features
    words.forEach((word, idx) => {
      const hash = this.simpleHash(word);
      for (let i = 0; i < 384; i++) {
        embedding[i] += Math.sin(hash + i) * 0.1;
      }
    });
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (norm || 1));
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  async getRecommendations(query) {
    if (!this.initialized) {
      throw new Error('Recommendation engine not initialized');
    }

    // Handle URL input by extracting text
    let processedQuery = query;
    if (this.isURL(query)) {
      processedQuery = await this.extractTextFromURL(query);
    }

    // Generate query embedding
    const queryEmbedding = await this.getEmbedding(processedQuery);
    
    // Calculate similarities
    const similarities = [];
    for (let i = 0; i < this.assessments.length; i++) {
      const assessmentEmbedding = this.embeddings.get(i);
      const similarity = this.cosineSimilarity(queryEmbedding, assessmentEmbedding);
      similarities.push({ index: i, similarity });
    }

    // Sort by similarity and get top recommendations
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Ensure balanced recommendations across test types
    const recommendations = this.balanceRecommendations(similarities, processedQuery);
    
    // Format recommendations according to API spec
    return recommendations.slice(0, 10).map(rec => {
      const assessment = this.assessments[rec.index];
      return {
        url: assessment.url,
        name: assessment.name,
        adaptive_support: assessment.adaptive_support,
        description: assessment.description,
        duration: assessment.duration,
        remote_support: assessment.remote_support,
        test_type: Array.isArray(assessment.test_type) 
          ? assessment.test_type 
          : [assessment.test_type]
      };
    });
  }

  balanceRecommendations(similarities, query) {
    const queryLower = query.toLowerCase();
    const recommendations = [];
    const testTypeGroups = {
      cognitive: [],
      personality: [],
      behavioral: [],
      situational: [],
      knowledge: [],
      ability: [],
      other: []
    };

    // Group similarities by test type
    similarities.forEach(sim => {
      const assessment = this.assessments[sim.index];
      const testTypes = Array.isArray(assessment.test_type) 
        ? assessment.test_type 
        : [assessment.test_type];
      
      let grouped = false;
      for (const testType of testTypes) {
        const typeKey = testType.toLowerCase();
        if (testTypeGroups[typeKey]) {
          testTypeGroups[typeKey].push(sim);
          grouped = true;
          break;
        }
      }
      
      if (!grouped) {
        testTypeGroups.other.push(sim);
      }
    });

    // Determine query focus areas
    const focusAreas = this.identifyQueryFocus(queryLower);
    
    // Balance recommendations based on query focus
    if (focusAreas.length > 1) {
      // Multi-domain query - balance across types
      const itemsPerType = Math.ceil(10 / focusAreas.length);
      
      focusAreas.forEach(area => {
        const group = testTypeGroups[area] || [];
        recommendations.push(...group.slice(0, itemsPerType));
      });
      
      // Fill remaining slots with top similarities
      const remaining = 10 - recommendations.length;
      if (remaining > 0) {
        const used = new Set(recommendations.map(r => r.index));
        const additional = similarities
          .filter(sim => !used.has(sim.index))
          .slice(0, remaining);
        recommendations.push(...additional);
      }
    } else {
      // Single domain or general query
      recommendations.push(...similarities.slice(0, 10));
    }

    return recommendations.slice(0, 10);
  }

  identifyQueryFocus(query) {
    const focusKeywords = {
      cognitive: ['cognitive', 'reasoning', 'numerical', 'verbal', 'logical', 'analytical'],
      personality: ['personality', 'behavioral', 'behavior', 'motivation', 'values', 'traits'],
      situational: ['situational', 'judgment', 'scenario', 'decision'],
      knowledge: ['knowledge', 'technical', 'skills', 'expertise', 'competency'],
      ability: ['ability', 'aptitude', 'capability', 'talent']
    };

    const focusAreas = [];
    for (const [area, keywords] of Object.entries(focusKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        focusAreas.push(area);
      }
    }

    return focusAreas.length > 0 ? focusAreas : ['cognitive', 'personality'];
  }

  isURL(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  async extractTextFromURL(url) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      // Simple text extraction - remove HTML tags
      const text = response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.substring(0, 2000); // Limit text length
    } catch (error) {
      console.warn(`Failed to extract text from URL ${url}:`, error.message);
      return url; // Fallback to using URL as query
    }
  }

  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm === 0 ? 0 : dotProduct / norm;
  }
}

module.exports = RecommendationEngine;