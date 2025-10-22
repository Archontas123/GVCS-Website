import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { SubmissionStatusUpdate } from '../../services/websocket';

interface SubmissionDisplay extends SubmissionStatusUpdate {
  teamName?: string;
  problemLetter?: string;
  language?: string;
  submissionTime?: string;
  codePreview?: string;
}

interface SubmissionDetailModalProps {
  submission: SubmissionDisplay | null;
  onClose: () => void;
}

const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ submission, onClose }) => {
  if (!submission) return null;

  const getVerdictInfo = (submission: SubmissionDisplay) => {
    if (submission.status === 'pending') {
      return {
        icon: 'PENDING',
        color: '#6b7280',
        text: 'Pending',
        bgColor: '#f3f4f6',
      };
    } else if (submission.status === 'judging') {
      return {
        icon: 'JUDGING',
        color: '#1d4ed8',
        text: 'Judging...',
        bgColor: '#dbeafe',
      };
    } else {
      switch (submission.verdict) {
        case 'Accepted':
          return {
            icon: 'AC',
            color: '#16a34a',
            text: 'Accepted',
            bgColor: '#dcfce7',
          };
        case 'Wrong Answer':
          return {
            icon: 'WA',
            color: '#dc2626',
            text: 'Wrong Answer',
            bgColor: '#fef2f2',
          };
        case 'Time Limit Exceeded':
          return {
            icon: 'TLE',
            color: '#d97706',
            text: 'Time Limit Exceeded',
            bgColor: '#fef3c7',
          };
        case 'Memory Limit Exceeded':
          return {
            icon: 'MLE',
            color: '#d97706',
            text: 'Memory Limit Exceeded',
            bgColor: '#fef3c7',
          };
        case 'Runtime Error':
          return {
            icon: 'RTE',
            color: '#7c2d12',
            text: 'Runtime Error',
            bgColor: '#fed7aa',
          };
        case 'Compilation Error':
          return {
            icon: 'CE',
            color: '#1d4ed8',
            text: 'Compilation Error',
            bgColor: '#dbeafe',
          };
        default:
          return {
            icon: 'UNK',
            color: '#6b7280',
            text: submission.verdict || 'Unknown',
            bgColor: '#f3f4f6',
          };
      }
    }
  };

  const getLanguageInfo = (language?: string) => {
    switch (language) {
      case 'cpp':
        return { name: 'C++', color: '#1d4ed8' };
      case 'java':
        return { name: 'Java', color: '#d97706' };
      case 'python':
        return { name: 'Python', color: '#16a34a' };
      default:
        return { name: language?.toUpperCase() || 'Unknown', color: '#6b7280' };
    }
  };

  const verdictInfo = getVerdictInfo(submission);
  const languageInfo = getLanguageInfo(submission.language);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: '600px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="card-header flex justify-between align-center">
          <h4>Submission Details</h4>
          <button
            className="btn btn-text"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="card-content">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Submission ID</div>
              <div style={{ fontWeight: '600' }}>#{submission.submissionId}</div>
            </div>

            <div>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Problem</div>
              <div style={{ fontWeight: '600' }}>
                {submission.problemLetter || `Problem ${submission.problemId}`}
              </div>
            </div>

            <div>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Language</div>
              <div style={{ fontWeight: '600' }}>
                {languageInfo.name}
              </div>
            </div>

            <div>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Status</div>
              <div style={{ fontWeight: '600' }}>
                {verdictInfo.text}
              </div>
            </div>

            {submission.executionTime && (
              <div>
                <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Execution Time</div>
                <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                  {submission.executionTime}ms
                </div>
              </div>
            )}
          </div>

          {submission.submissionTime && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="text-muted" style={{ fontSize: '12px', marginBottom: '4px' }}>Submitted</div>
              <div style={{ fontWeight: '600' }}>
                {formatDistanceToNow(new Date(submission.submissionTime))} ago
                <div className="text-muted" style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px' }}>
                  {new Date(submission.submissionTime).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="card-actions flex justify-end">
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailModal;
