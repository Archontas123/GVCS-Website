/**
 * CS Club Hackathon Platform - Execution API Tests
 * Phase 1.3: Test execution API endpoints
 */

const request = require('supertest');

// Mock the docker executor to prevent Docker operations in tests
jest.mock('../services/dockerExecutor', () => {
    return class MockDockerExecutor {
        constructor() {
            this.containerImage = 'hackathon-judge';
            this.maxConcurrentContainers = 10;
            this.activeContainers = new Map();
        }

        async initialize() {
            return true;
        }

        getStatus() {
            return {
                activeContainers: this.activeContainers.size,
                maxConcurrentContainers: this.maxConcurrentContainers,
                supportedLanguages: ['cpp', 'java', 'python']
            };
        }

        getLanguageTemplate(language) {
            const templates = {
                'cpp': '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
                'java': 'public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
                'python': '# Your code here\n'
            };
            return templates[language] || '';
        }

        async executeCode(language, code, input = '', timeLimit = 5, memoryLimit = 256) {
            // Mock successful execution
            return {
                verdict: 'AC',
                exitCode: 0,
                output: 'Hello World',
                error: '',
                executionTime: 0.123,
                memoryUsed: 1024,
                compileTime: 0.045
            };
        }

        async emergencyCleanup() {
            this.activeContainers.clear();
        }
    };
});

const app = require('../server');

describe('Phase 1.3: Execution API Endpoints', () => {
    describe('GET /api/execute/status', () => {
        test('should return system status', async () => {
            const response = await request(app)
                .get('/api/execute/status')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('activeContainers');
            expect(response.body.data).toHaveProperty('maxConcurrentContainers');
            expect(response.body.data).toHaveProperty('supportedLanguages');
            expect(response.body.data).toHaveProperty('systemTime');
            expect(response.body.data).toHaveProperty('uptime');
            
            expect(response.body.data.supportedLanguages).toEqual(['cpp', 'java', 'python']);
            expect(response.body.data.maxConcurrentContainers).toBe(10);
        });
    });

    describe('GET /api/execute/languages', () => {
        test('should return supported languages', async () => {
            const response = await request(app)
                .get('/api/execute/languages')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            
            const languages = response.body.data;
            const languageIds = languages.map(l => l.id);
            expect(languageIds).toEqual(expect.arrayContaining(['cpp', 'java', 'python']));
            
            languages.forEach(lang => {
                expect(lang).toHaveProperty('id');
                expect(lang).toHaveProperty('name');
                expect(lang).toHaveProperty('version');
                expect(lang).toHaveProperty('timeMultiplier');
                expect(lang).toHaveProperty('memoryMultiplier');
                expect(lang).toHaveProperty('fileExtension');
            });
        });
    });

    describe('GET /api/execute/template/:language', () => {
        test('should return C++ template', async () => {
            const response = await request(app)
                .get('/api/execute/template/cpp')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.language).toBe('cpp');
            expect(response.body.data.template).toContain('#include <iostream>');
            expect(response.body.data.template).toContain('int main()');
        });

        test('should return Java template', async () => {
            const response = await request(app)
                .get('/api/execute/template/java')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.language).toBe('java');
            expect(response.body.data.template).toContain('public class Solution');
            expect(response.body.data.template).toContain('public static void main');
        });

        test('should return Python template', async () => {
            const response = await request(app)
                .get('/api/execute/template/python')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.language).toBe('python');
            expect(response.body.data.template).toContain('# Your code here');
        });

        test('should reject invalid language', async () => {
            const response = await request(app)
                .get('/api/execute/template/invalid')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid language');
        });
    });

    describe('POST /api/execute/test', () => {
        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid input');
        });

        test('should validate language', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'invalid',
                    code: 'print("hello")'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid input');
        });

        test('should validate code is not empty', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: ''
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid input');
        });

        test('should enforce time limit bounds', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("hello")',
                    timeLimit: 100  // Above maximum of 30
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should enforce memory limit bounds', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("hello")',
                    memoryLimit: 1000  // Above maximum of 512
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should enforce code size limit', async () => {
            const longCode = 'a'.repeat(60000);  // Above 50KB limit
            
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: longCode
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should accept valid execution request', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("hello world")',
                    input: '',
                    timeLimit: 5,
                    memoryLimit: 256
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('verdict');
            expect(response.body.data).toHaveProperty('executionTime');
            expect(response.body.data).toHaveProperty('memoryUsed');
            expect(response.body.data).toHaveProperty('output');
            expect(response.body.data.verdict).toBe('AC');
        });

        test('should accept valid C++ execution request', async () => {
            const cppCode = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`;

            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'cpp',
                    code: cppCode,
                    timeLimit: 2,
                    memoryLimit: 128
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.verdict).toBe('AC');
        });

        test('should accept valid Java execution request', async () => {
            const javaCode = `public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`;

            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'java',
                    code: javaCode,
                    timeLimit: 10,
                    memoryLimit: 512
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.verdict).toBe('AC');
        });

        test('should use default values for optional parameters', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("test")'
                    // input, timeLimit, memoryLimit not specified
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Input Validation Edge Cases', () => {
        test('should handle empty input string', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("test")',
                    input: ''
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        test('should handle input with special characters', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print(input())',
                    input: 'Hello\nWorld\n!@#$%'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        test('should enforce minimum time limit', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("test")',
                    timeLimit: 0  // Below minimum of 1
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should enforce minimum memory limit', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("test")',
                    memoryLimit: 16  // Below minimum of 32
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});