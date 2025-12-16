import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError('');
    setRecommendations([]);

    try {
      const response = await axios.post('/recommend', { query });
      setRecommendations(response.data.recommended_assessments || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "I am hiring for Java developers who can also collaborate effectively with my business teams.",
    "Looking to hire mid-level professionals who are proficient in Python, SQL and Java Script.",
    "Need a Java developer who is good in collaborating with external teams and stakeholders."
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>SHL Assessment Recommendation Engine</h1>
        <p>Get personalized assessment recommendations for your hiring needs</p>
      </header>

      <main className="App-main">
        <div className="query-section">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="query">Job Description or Query:</label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your job description, requirements, or a URL containing job details..."
                rows={4}
                disabled={loading}
              />
            </div>
            
            <button type="submit" disabled={loading || !query.trim()}>
              {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
            </button>
          </form>

          <div className="sample-queries">
            <h3>Sample Queries:</h3>
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                className="sample-query"
                onClick={() => setQuery(sample)}
                disabled={loading}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2>Recommended Assessments ({recommendations.length})</h2>
            <div className="recommendations-grid">
              {recommendations.map((assessment, index) => (
                <div key={index} className="assessment-card">
                  <h3>{assessment.name}</h3>
                  <p className="description">{assessment.description}</p>
                  
                  <div className="assessment-details">
                    <div className="detail-item">
                      <strong>Duration:</strong> {assessment.duration} minutes
                    </div>
                    <div className="detail-item">
                      <strong>Test Types:</strong> {assessment.test_type.join(', ')}
                    </div>
                    <div className="detail-item">
                      <strong>Adaptive:</strong> {assessment.adaptive_support}
                    </div>
                    <div className="detail-item">
                      <strong>Remote:</strong> {assessment.remote_support}
                    </div>
                  </div>
                  
                  <a 
                    href={assessment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="assessment-link"
                  >
                    View Assessment Details →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Analyzing your query and finding the best assessments...</p>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>SHL Assessment Recommendation Engine - Powered by AI/RAG Technology</p>
      </footer>
    </div>
  );
}

export default App;