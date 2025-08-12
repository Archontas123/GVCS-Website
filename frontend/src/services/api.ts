/**
 * CS Club Hackathon Platform - API Service
 * Phase 1.4: Axios configuration and API endpoint utilities
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  Team,
  Contest,
  Problem,
  Submission,
  ExecutionResult,
  LeaderboardEntry,
  LanguageConfig,
  RegisterFormData,
  LoginFormData,
  SubmissionFormData
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      // For admin routes, use admin token
      if (config.url?.startsWith('/admin/')) {
        const adminToken = localStorage.getItem('hackathon_admin_token');
        if (adminToken) {
          config.headers.Authorization = `Bearer ${adminToken}`;
        }
      } else {
        // For team routes, use team token
        const token = localStorage.getItem('hackathon_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('hackathon_token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Team authentication endpoints
  async registerTeam(data: RegisterFormData): Promise<ApiResponse<{ team: Team; token: string }>> {
    const response = await this.api.post('/team/register', data);
    return response.data;
  }

  async loginTeam(data: LoginFormData): Promise<ApiResponse<{ team: Team; token: string }>> {
    const response = await this.api.post('/team/login', data);
    return response.data;
  }

  async getTeamStatus(): Promise<ApiResponse<{ team: Team; contest: Contest }>> {
    const response = await this.api.get('/team/status');
    return response.data;
  }

  // Contest endpoints
  async getContest(contestId: number): Promise<ApiResponse<Contest>> {
    const response = await this.api.get(`/contests/${contestId}`);
    return response.data;
  }

  async getContestProblems(contestId: number): Promise<ApiResponse<Problem[]>> {
    const response = await this.api.get(`/api/problems?contestId=${contestId}`);
    return response.data;
  }

  // Problem endpoints
  async getProblem(problemId: number): Promise<ApiResponse<Problem>> {
    const response = await this.api.get(`/problems/${problemId}`);
    return response.data;
  }

  // Submission endpoints
  async submitSolution(data: SubmissionFormData): Promise<ApiResponse<{ submissionId: number }>> {
    const response = await this.api.post('/execute/submit', {
      language: data.language,
      code: data.code,
      problemId: data.problemId,
    });
    return response.data;
  }

  async getTeamSubmissions(teamId?: number): Promise<ApiResponse<Submission[]>> {
    const url = teamId ? `/submissions?teamId=${teamId}` : '/submissions';
    const response = await this.api.get(url);
    return response.data;
  }

  async getSubmission(submissionId: number): Promise<ApiResponse<Submission>> {
    const response = await this.api.get(`/submissions/${submissionId}`);
    return response.data;
  }

  // Code execution endpoints (for testing)
  async testCode(language: string, code: string, input: string = ''): Promise<ApiResponse<ExecutionResult>> {
    const response = await this.api.post('/execute/test', {
      language,
      code,
      input,
    });
    return response.data;
  }

  async getSupportedLanguages(): Promise<ApiResponse<LanguageConfig[]>> {
    const response = await this.api.get('/execute/languages');
    return response.data;
  }

  async getLanguageTemplate(language: string): Promise<ApiResponse<{ language: string; template: string }>> {
    const response = await this.api.get(`/execute/template/${language}`);
    return response.data;
  }

  async getExecutionStatus(): Promise<ApiResponse<{ activeContainers: number; maxConcurrentContainers: number; supportedLanguages: string[] }>> {
    const response = await this.api.get('/execute/status');
    return response.data;
  }

  // Leaderboard endpoints
  async getLeaderboard(contestId: number): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; statistics?: any }>> {
    const response = await this.api.get(`/api/leaderboard/${contestId}`);
    return response.data;
  }

  async getTeamStatistics(teamId: number, contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/leaderboard/${contestId}/team/${teamId}`);
    return response.data;
  }

  // Contest timer endpoints
  async getContestTimer(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/timer/contest/${contestCode}`);
    return response.data;
  }

  async getContestStatus(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/api/timer/contest/${contestCode}/status`);
    return response.data;
  }

  async pingTeamActivity(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/api/timer/contest/${contestCode}/ping`);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Admin authentication endpoints
  async adminLogin(data: { username: string; password: string }): Promise<ApiResponse<{ admin: any; token: string }>> {
    const response = await this.api.post('/admin/login', data);
    return response.data;
  }

  // Admin contest management endpoints
  async createContest(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/admin/contests', data);
    return response.data;
  }

  async getAdminContests(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/admin/contests');
    return response.data;
  }

  async updateContest(contestId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/admin/contests/${contestId}`, data);
    return response.data;
  }

  async deleteContest(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/admin/contests/${contestId}`);
    return response.data;
  }

  async startContest(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/start`);
    return response.data;
  }

  async freezeContest(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/freeze`);
    return response.data;
  }

  async endContest(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/end`);
    return response.data;
  }

  // Admin problem management endpoints
  async getAdminContestProblems(contestId: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/admin/contests/${contestId}/problems`);
    return response.data;
  }

  async createProblem(contestId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/problems`, data);
    return response.data;
  }

  async updateProblem(problemId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/admin/problems/${problemId}`, data);
    return response.data;
  }

  async deleteProblem(problemId: number): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/admin/problems/${problemId}`);
    return response.data;
  }

  // Admin test case management endpoints
  async getProblemTestCases(problemId: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/admin/problems/${problemId}/testcases`);
    return response.data;
  }

  async createTestCase(problemId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/problems/${problemId}/testcases`, data);
    return response.data;
  }

  async bulkCreateTestCases(problemId: number, formData: FormData): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/problems/${problemId}/testcases/bulk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string): void {
    localStorage.setItem('hackathon_token', token);
  }

  removeAuthToken(): void {
    localStorage.removeItem('hackathon_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('hackathon_token');
  }

  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  // Admin token methods
  setAdminToken(token: string): void {
    localStorage.setItem('hackathon_admin_token', token);
  }

  removeAdminToken(): void {
    localStorage.removeItem('hackathon_admin_token');
  }

  getAdminToken(): string | null {
    return localStorage.getItem('hackathon_admin_token');
  }

  isAdminAuthenticated(): boolean {
    return this.getAdminToken() !== null;
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;