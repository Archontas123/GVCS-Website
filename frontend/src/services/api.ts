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
import { createContestSlug } from '../utils/contestUtils';


class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
      timeout: 30000, 
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const isPublicRoute = config.url?.includes('/public');
      
      if (!isPublicRoute) {
        if (config.url?.startsWith('/admin/')) {
          const adminToken = localStorage.getItem('programming_contest_admin_token');
          if (adminToken) {
            config.headers.Authorization = `Bearer ${adminToken}`;
          }
        } else {
          const token = localStorage.getItem('programming_contest_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Check if this is an admin route error
          if (error.config?.url?.startsWith('/admin/')) {
            localStorage.removeItem('programming_contest_admin_token');
            window.location.href = '/admin/login';
          } else {
            localStorage.removeItem('programming_contest_token');
            window.location.href = '/';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async registerTeam(data: RegisterFormData): Promise<ApiResponse<{ teamId: number; teamName: string; contestCode: string; contestName: string; schoolName: string; memberNames: string[]; token: string; registeredAt: string }>> {
    const payload = {
      teamName: data.teamName,
      contestCode: data.contestCode,
      password: data.password,
      schoolName: data.schoolName,
      memberNames: data.memberNames
    };
    const response = await this.api.post('/team/register', payload);
    return response.data;
  }

  async loginTeam(data: LoginFormData): Promise<ApiResponse<{ teamId: number; teamName: string; contestCode: string; contestName: string; schoolName: string; memberNames: string[]; token: string; lastActivity: string }>> {
    const payload = {
      teamName: data.teamName,
      password: data.password
    };
    const response = await this.api.post('/team/login', payload);
    return response.data;
  }

  async getTeamStatus(): Promise<ApiResponse<{ team: Team; contest: Contest }>> {
    const response = await this.api.get('/team/status');
    return response.data;
  }

  async getContest(contestId: number): Promise<ApiResponse<Contest>> {
    const response = await this.api.get(`/contests/${contestId}`);
    return response.data;
  }

  async getContestProblems(contestId?: number): Promise<ApiResponse<Problem[]>> {
    const response = await this.api.get('/team/contest/problems');
    return response.data;
  }

  async getProblem(problemId: number): Promise<ApiResponse<Problem>> {
    const response = await this.api.get(`/team/problems/${problemId}`);
    return response.data;
  }

  // REMOVED: Public problem access methods - now require authentication
  // async getProblemPublic(problemId: number): Promise<ApiResponse<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>> {
  //   const response = await this.api.get(`/admin/problems/${problemId}/public`);
  //   return response.data;
  // }

  // async getContestProblemsPublic(contestId: number): Promise<ApiResponse<Array<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>>> {
  //   const response = await this.api.get(`/admin/contests/${contestId}/problems/public`);
  //   return response.data;
  // }

  // async getContestProblemsByCode(registrationCode: string): Promise<ApiResponse<Array<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>>> {
  //   const response = await this.api.get(`/contests/${registrationCode}/problems/public`);
  //   return response.data;
  // }

  // async getContestProblemsBySlug(contestSlug: string): Promise<ApiResponse<Array<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>>> {
  //   const response = await this.api.get(`/contests/${contestSlug}/problems/public`);
  //   return response.data;
  // }

  // REMOVED: Public contest problems access - now requires authentication
  // async getContestProblemsByName(contestName: string): Promise<ApiResponse<Array<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>>> {
  //   const slug = createContestSlug(contestName);
  //   const response = await this.api.get(`/contests/${slug}/problems/public`);
  //   return response.data;
  // }

  // Authenticated methods for contest problems (requires team login)
  async getContestProblemsBySlug(contestSlug: string): Promise<ApiResponse<Array<Problem & { sample_test_cases: Array<{ input: string; expected_output: string }> }>>> {
    const response = await this.api.get(`/contests/${contestSlug}/problems/public`);
    return response.data;
  }

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

  async getLeaderboard(contestId: number): Promise<ApiResponse<{ leaderboard: LeaderboardEntry[]; statistics?: any }>> {
    const response = await this.api.get(`/leaderboard/${contestId}`);
    return response.data;
  }

  async getTeamStatistics(teamId: number, contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/leaderboard/${contestId}/team/${teamId}`);
    return response.data;
  }

  async getContestTimer(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/timer/contest/${contestCode}`);
    return response.data;
  }

  async getContestStatus(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/timer/contest/${contestCode}/status`);
    return response.data;
  }

  async pingTeamActivity(contestCode: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/timer/contest/${contestCode}/ping`);
    return response.data;
  }

  async getDashboardOverview(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/dashboard/overview');
    return response.data;
  }

  async getDashboardStandings(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/dashboard/standings');
    return response.data;
  }

  async getDashboardActivity(limit: number = 15): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/dashboard/activity?limit=${limit}`);
    return response.data;
  }

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const response = await this.api.get('/health');
    return response.data;
  }

  async adminLogin(data: { username: string; password: string }): Promise<ApiResponse<{ admin: any; token: string }>> {
    const response = await this.api.post('/admin/login', data);
    return response.data;
  }

  async getAdminProfile(): Promise<ApiResponse<{ id: number; username: string; email: string; role: string; created_at: string; statistics: any }>> {
    const response = await this.api.get('/admin/profile');
    return response.data;
  }

  async createContest(data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/admin/contests', data);
    return response.data;
  }

  async getAdminContests(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/admin/contests');
    return response.data;
  }

  async getAdminContest(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/admin/contests/${contestId}`);
    return response.data;
  }

  async updateContest(contestId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.put(`/admin/contests/${contestId}`, data);
    return response.data;
  }

  async updateAdminContest(contestId: number, data: any): Promise<ApiResponse<any>> {
    const transformedData = {
      contest_name: data.contestName,
      description: data.description,
      start_time: data.startTime,
      duration: data.duration,
      freeze_time: data.freezeTime,
      is_active: data.isActive
    };
    
    const response = await this.api.put(`/admin/contests/${contestId}`, transformedData);
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

  async getAdminContestTeams(contestId: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/admin/teams/registrations?contest_id=${contestId}`);
    return response.data;
  }

  async getAdminProblems(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/admin/problems');
    return response.data;
  }

  async getAdminContestProblems(contestId: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/admin/contests/${contestId}/problems`);
    return response.data;
  }

  async createProblem(contestId: number, data: any): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/problems`, data);
    return response.data;
  }

  async copyProblemToContest(contestId: number, problemId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/contests/${contestId}/problems/copy`, { problemId });
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

  async getDashboardStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/dashboard/stats');
    return response.data;
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/system/health');
    return response.data;
  }

  async getJudgeQueue(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/judge/queue');
    return response.data;
  }

  async getContestLiveStats(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/admin/contests/${contestId}/live-stats`);
    return response.data;
  }

  async getContestProgress(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/admin/contests/${contestId}/progress`);
    return response.data;
  }

  async getTeamRegistrations(params?: { status?: string; contest_id?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    const response = await this.api.get(`/admin/teams/registrations${queryString}`);
    return response.data;
  }

  async getTeamStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/teams/stats');
    return response.data;
  }

  async approveTeam(teamId: number): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/teams/${teamId}/approve`);
    return response.data;
  }

  async rejectTeam(teamId: number, reason?: string): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/admin/teams/${teamId}/reject`, { reason });
    return response.data;
  }

  async getLiveSubmissions(params?: { contest_id?: number; language?: string; status?: string; limit?: number }): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    const response = await this.api.get(`/admin/submissions/live${queryString}`);
    return response.data;
  }

  async getSubmissionStats(contestId?: number): Promise<ApiResponse<any>> {
    const queryString = contestId ? `?contest_id=${contestId}` : '';
    const response = await this.api.get(`/admin/submissions/stats${queryString}`);
    return response.data;
  }

  async getSubmissionAnalytics(contestId?: number): Promise<ApiResponse<any>> {
    const queryString = contestId ? `?contest_id=${contestId}` : '';
    const response = await this.api.get(`/admin/submissions/analytics${queryString}`);
    return response.data;
  }

  async getSystemStatus(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/system/status');
    return response.data;
  }

  async getSystemMetrics(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/system/metrics');
    return response.data;
  }

  async getSystemLogs(params?: { level?: string; limit?: number; service?: string }): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    const response = await this.api.get(`/admin/system/logs${queryString}`);
    return response.data;
  }

  async getAdminContestProjects(contestId: number): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/admin/contests/${contestId}/projects`);
    return response.data;
  }

  async downloadProject(submissionId: number): Promise<Blob> {
    const response = await this.api.get(`/admin/projects/${submissionId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async submitProject(contestId: number, formData: FormData): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/team/contests/${contestId}/projects`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getTeamProjectSubmission(contestId: number): Promise<ApiResponse<any>> {
    const response = await this.api.get(`/team/contests/${contestId}/projects/my-submission`);
    return response.data;
  }

  setAuthToken(token: string): void {
    localStorage.setItem('programming_contest_token', token);
  }

  removeAuthToken(): void {
    localStorage.removeItem('programming_contest_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('programming_contest_token');
  }

  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  setAdminToken(token: string): void {
    localStorage.setItem('programming_contest_admin_token', token);
  }

  removeAdminToken(): void {
    localStorage.removeItem('programming_contest_admin_token');
  }

  getAdminToken(): string | null {
    return localStorage.getItem('programming_contest_admin_token');
  }

  isAdminAuthenticated(): boolean {
    return this.getAdminToken() !== null;
  }
}

const apiService = new ApiService();
export default apiService;