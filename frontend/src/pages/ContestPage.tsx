import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Problem } from '../types';
import apiService from '../services/api';
import { createContestSlug } from '../utils/contestUtils';
import '../styles/theme.css';

interface ContestProblem extends Problem {
  sample_test_cases: Array<{
    input: string;
    expected_output: string;
  }>;
}

const ContestPage: React.FC = () => {
  const { contestSlug } = useParams<{ contestSlug: string }>();
  const navigate = useNavigate();
  
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contestName, setContestName] = useState<string>('');

  useEffect(() => {
    if (contestSlug) {
      fetchContestProblems(contestSlug);
    }
  }, [contestSlug]);

  const fetchContestProblems = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getContestProblemsBySlug(slug);
      if (response.success) {
        setProblems(response.data);
        if (response.data.length > 0) {
          setContestName(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
      } else {
        setError('Contest problems not found or not accessible');
      }
    } catch (err: any) {
      console.error('Failed to load contest problems:', err);
      setError(err.response?.data?.message || 'Failed to load contest problems');
    } finally {
      setLoading(false);
    }
  };

  const handleProblemClick = (problem: ContestProblem) => {
    navigate(`/problem/${problem.id}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex-center full-height">
        <div className="spinner spinner-lg"></div>
        <p>Loading contest...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center full-height">
        <div className="error-container">
          <h2>Contest Not Found</h2>
          <p>{error}</p>
          <button onClick={handleBackToDashboard} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contest-page">
      <header className="contest-header">
        <div className="container">
          <div>
            <h1>{contestName}</h1>
            <p>{problems.length} problem{problems.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>
      </header>

      <main className="contest-content">
        <div className="container">
          {problems.length === 0 ? (
            <div className="no-problems">
              <h3>No problems available yet</h3>
              <p>The contest organizer hasn't added any problems to this contest yet.</p>
            </div>
          ) : (
            <div className="problems-grid">
              {problems.map((problem) => (
                <div 
                  key={problem.id} 
                  className="problem-card"
                  onClick={() => handleProblemClick(problem)}
                >
                  <div className="problem-header">
                    <span className="problem-letter">{problem.problemLetter || problem.letter || '?'}</span>
                    <span className={`difficulty difficulty-${problem.difficulty}`}>
                      {problem.difficulty}
                    </span>
                  </div>
                  
                  <h3 className="problem-title">{problem.title}</h3>
                  
                  <div className="problem-stats">
                    <span>Time: {problem.timeLimit}ms</span>
                    <span>Memory: {problem.memoryLimit}MB</span>
                  </div>
                  
                  <div className="problem-description">
                    {problem.description && problem.description.length > 150
                      ? `${problem.description.substring(0, 150)}...`
                      : problem.description
                    }
                  </div>
                  
                  {problem.sample_test_cases && problem.sample_test_cases.length > 0 && (
                    <div className="sample-indicator">
                      {problem.sample_test_cases.length} sample test case{problem.sample_test_cases.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        .contest-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .contest-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 2rem 0;
          margin-bottom: 2rem;
        }

        .contest-header h1 {
          margin: 0;
          color: #1e293b;
          font-size: 2rem;
          font-weight: 700;
        }

        .contest-header p {
          margin: 0.5rem 0 0 0;
          color: #64748b;
        }

        .contest-content {
          padding-bottom: 2rem;
        }

        .problems-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .problem-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .problem-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }

        .problem-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .problem-letter {
          background: #3b82f6;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .difficulty {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .difficulty-easy {
          background: #d1fae5;
          color: #065f46;
        }

        .difficulty-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .difficulty-hard {
          background: #fee2e2;
          color: #991b1b;
        }

        .problem-title {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .problem-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .problem-description {
          color: #475569;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .sample-indicator {
          font-size: 0.75rem;
          color: #3b82f6;
          font-weight: 500;
        }

        .no-problems {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .no-problems h3 {
          margin: 0 0 1rem 0;
          color: #1e293b;
        }

        .error-container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .error-container h2 {
          color: #dc2626;
          margin: 0 0 1rem 0;
        }

        .error-container p {
          color: #64748b;
          margin: 0 0 1.5rem 0;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: #f1f5f9;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }


        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1rem;
        }

        .full-height {
          min-height: 100vh;
        }

        .spinner {
          border: 2px solid #f3f4f6;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }

        .spinner-lg {
          width: 40px;
          height: 40px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContestPage;