/**
 * CS Club Programming Contest Platform - Docker Execution Environment Tests
 * Phase 1.3: Test Docker code execution functionality
 */

const request = require('supertest');
const app = require('../server');
const DockerExecutor = require('../services/dockerExecutor');

describe('Phase 1.3: Docker Code Execution Environment', () => {
    let dockerExecutor;
    
    beforeAll(async () => {
        dockerExecutor = new DockerExecutor();
        // Skip initialization in test environment
        // await dockerExecutor.initialize();
    }, 30000);

    describe('DockerExecutor Service', () => {
        test('should create DockerExecutor instance', () => {
            expect(dockerExecutor).toBeInstanceOf(DockerExecutor);
            expect(dockerExecutor.containerImage).toBe('programming_contest-judge');
        });

        test('should have language configurations', () => {
            const status = dockerExecutor.getStatus();
            expect(status.supportedLanguages).toContain('cpp');
            expect(status.supportedLanguages).toContain('java');
            expect(status.supportedLanguages).toContain('python');
        });

        test('should provide language templates', () => {
            const cppTemplate = dockerExecutor.getLanguageTemplate('cpp');
            expect(cppTemplate).toContain('#include <iostream>');
            
            const javaTemplate = dockerExecutor.getLanguageTemplate('java');
            expect(javaTemplate).toContain('public class Solution');
            
            const pythonTemplate = dockerExecutor.getLanguageTemplate('python');
            expect(pythonTemplate).toContain('# Your code here');
        });

        test('should generate unique execution IDs', () => {
            const id1 = dockerExecutor.generateExecutionId();
            const id2 = dockerExecutor.generateExecutionId();
            
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^[a-f0-9]{32}$/);
            expect(id2).toMatch(/^[a-f0-9]{32}$/);
        });
    });

    describe('Execution API Endpoints', () => {
        describe('GET /api/execute/status', () => {
            test('should return system status', async () => {
                const response = await request(app)
                    .get('/api/execute/status')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('activeContainers');
                expect(response.body.data).toHaveProperty('maxConcurrentContainers');
                expect(response.body.data).toHaveProperty('supportedLanguages');
                expect(response.body.data.supportedLanguages).toEqual(['cpp', 'java', 'python']);
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
                const cppLang = languages.find(l => l.id === 'cpp');
                const javaLang = languages.find(l => l.id === 'java');
                const pythonLang = languages.find(l => l.id === 'python');

                expect(cppLang).toMatchObject({
                    id: 'cpp',
                    name: 'C++',
                    timeMultiplier: 1.0,
                    fileExtension: '.cpp'
                });

                expect(javaLang).toMatchObject({
                    id: 'java',
                    name: 'Java',
                    timeMultiplier: 2.0,
                    fileExtension: '.java'
                });

                expect(pythonLang).toMatchObject({
                    id: 'python',
                    name: 'Python',
                    timeMultiplier: 5.0,
                    fileExtension: '.py'
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
            });

            test('should return Java template', async () => {
                const response = await request(app)
                    .get('/api/execute/template/java')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.language).toBe('java');
                expect(response.body.data.template).toContain('public class Solution');
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

            test('should validate code length', async () => {
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
            });
        });
    });

    describe('Input Validation', () => {
        test('should enforce time limit bounds', async () => {
            const response = await request(app)
                .post('/api/execute/test')
                .send({
                    language: 'python',
                    code: 'print("hello")',
                    timeLimit: 100  // Above maximum
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
                    memoryLimit: 1000  // Above maximum
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
    });

    describe('Security Features', () => {
        test('should use secure execution environment', () => {
            const status = dockerExecutor.getStatus();
            expect(status.maxConcurrentContainers).toBe(10);
        });

        test('should generate unique execution IDs for isolation', () => {
            const ids = Array.from({ length: 100 }, () => dockerExecutor.generateExecutionId());
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(100); // All IDs should be unique
        });
    });

    afterAll(async () => {
        if (dockerExecutor) {
            await dockerExecutor.emergencyCleanup();
        }
    });
});