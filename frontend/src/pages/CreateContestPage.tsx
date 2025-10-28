import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import apiService from '../services/api';
import { MdSave } from 'react-icons/md';

interface ContestFormData {
  contest_name: string;
  description: string;
}

const CreateContestPage: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  
  const [formData, setFormData] = useState<ContestFormData>({
    contest_name: '',
    description: '',
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof ContestFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.contest_name.trim()) {
      newErrors.push('Contest name is required');
    } else if (formData.contest_name.trim().length < 3) {
      newErrors.push('Contest name must be at least 3 characters long');
    }

    if (!formData.description.trim()) {
      newErrors.push('Contest description is required');
    } else if (formData.description.trim().length < 10) {
      newErrors.push('Contest description must be at least 10 characters long');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const contestData = {
        contest_name: formData.contest_name.trim(),
        description: formData.description.trim(),
        manual_control: true,
        is_active: false
      };

      const response = await apiService.createContest(contestData);
      
      if (response.success) {
        setSuccess(`Contest "${response.data.contest_name}" created successfully! Registration code: ${response.data.registration_code}`);
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 3000);
      } else {
        setErrors([response.message || 'Failed to create contest']);
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to create contest']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .contest-form-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            font-family: "Inter", "Segoe UI", system-ui, sans-serif;
          }
          
          .header {
            background: #1d4ed8;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          
          .header-back-btn {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 4px;
            transition: background-color 0.2s;
          }
          
          .header-back-btn:hover {
            background-color: rgba(255,255,255,0.1);
          }
          
          .header-title {
            flex-grow: 1;
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }
          
          .header-admin {
            opacity: 0.9;
            font-size: 0.875rem;
          }
          
          .main-container {
            max-width: 48rem;
            margin: 0 auto;
            padding: 2rem 1rem;
          }
          
          .form-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            padding: 2rem;
          }
          
          .form-title {
            font-size: 2rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 1.5rem;
          }
          
          .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
          }
          
          .alert-success {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          
          .alert-error {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }
          
          .form-grid {
            display: grid;
            gap: 1.5rem;
          }
          
          .form-field {
            display: flex;
            flex-direction: column;
          }
          
          .form-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }
          
          .form-input, .form-select, .form-textarea {
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
            font-family: inherit;
          }
          
          .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: #1d4ed8;
            box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1);
          }
          
          .form-input:disabled, .form-select:disabled, .form-textarea:disabled {
            background-color: #f9fafb;
            color: #6b7280;
            cursor: not-allowed;
          }
          
          .form-helper {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.25rem;
          }

          .manual-mode-banner {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1d4ed8;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            line-height: 1.4;
          }
          
          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
          
          @media (max-width: 768px) {
            .form-row {
              grid-template-columns: 1fr;
            }
          }
          
          .button-group {
            display: flex;
            gap: 1rem;
            padding-top: 1rem;
          }
          
          .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border: none;
          }
          
          .btn-outline {
            background: white;
            color: #6b7280;
            border: 2px solid #d1d5db;
          }
          
          .btn-outline:hover:not(:disabled) {
            background: #f9fafb;
            border-color: #9ca3af;
          }
          
          .btn-primary {
            background: #1d4ed8;
            color: white;
            min-width: 150px;
            padding: 0.75rem 2rem;
          }
          
          .btn-primary:hover:not(:disabled) {
            background: #1e40af;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
          }
          
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          
          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        `}
      </style>
      
      <div className="contest-form-container">
        <div className="header">
          <button
            className="header-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← Back
          </button>
          <h1 className="header-title">Create New Contest</h1>
          <div className="header-admin">Admin: {admin?.username}</div>
        </div>

        <div className="main-container">
          <div className="form-card">
            <h2 className="form-title">Contest Details</h2>

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {errors.length > 0 && (
              <div className="alert alert-error">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Contest Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.contest_name}
                    onChange={(e) => handleChange('contest_name', e.target.value)}
                    placeholder="e.g., Fall 2025 Programming Contest"
                    disabled={isLoading}
                  />
                  <div className="form-helper">This will be displayed to participants</div>
                </div>

                <div className="form-field">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe the contest, rules, and any special instructions..."
                    disabled={isLoading}
                  />
                  <div className="form-helper">Provide details about the contest for participants</div>
                </div>

                <div className="form-field">
                  <label className="form-label">Contest Scheduling</label>
                  <div className="manual-mode-banner">
                    <strong>Manual control enabled.</strong> You can start and end this contest from the admin dashboard when you're ready. No preset start time is required.
                  </div>
                </div>

                <div className="button-group">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => navigate('/admin/dashboard')}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading && <div className="spinner"></div>}
                    {isLoading ? 'Creating...' : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MdSave /> Create Contest
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateContestPage;
