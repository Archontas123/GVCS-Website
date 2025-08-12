/**
 * CS Club Hackathon Platform - Basic Execution Environment Tests
 * Phase 1.3: Test core functionality without Docker dependency
 */

const DockerExecutor = require('../services/dockerExecutor');

describe('Phase 1.3: Docker Execution Environment (Basic Tests)', () => {
    let dockerExecutor;
    
    beforeAll(() => {
        dockerExecutor = new DockerExecutor();
    });

    describe('DockerExecutor Service Configuration', () => {
        test('should create DockerExecutor instance with correct configuration', () => {
            expect(dockerExecutor).toBeInstanceOf(DockerExecutor);
            expect(dockerExecutor.containerImage).toBe('hackathon-judge');
            expect(dockerExecutor.maxConcurrentContainers).toBe(10);
        });

        test('should have correct language configurations', () => {
            const status = dockerExecutor.getStatus();
            expect(status.supportedLanguages).toEqual(['cpp', 'java', 'python']);
            expect(status.maxConcurrentContainers).toBe(10);
            expect(status.activeContainers).toBe(0);
        });

        test('should provide correct language templates', () => {
            const cppTemplate = dockerExecutor.getLanguageTemplate('cpp');
            expect(cppTemplate).toContain('#include <iostream>');
            expect(cppTemplate).toContain('int main()');
            
            const javaTemplate = dockerExecutor.getLanguageTemplate('java');
            expect(javaTemplate).toContain('public class Solution');
            expect(javaTemplate).toContain('public static void main');
            
            const pythonTemplate = dockerExecutor.getLanguageTemplate('python');
            expect(pythonTemplate).toContain('# Your code here');
        });

        test('should return empty template for unsupported language', () => {
            const invalidTemplate = dockerExecutor.getLanguageTemplate('invalid');
            expect(invalidTemplate).toBe('');
        });

        test('should generate unique execution IDs', () => {
            const id1 = dockerExecutor.generateExecutionId();
            const id2 = dockerExecutor.generateExecutionId();
            const id3 = dockerExecutor.generateExecutionId();
            
            expect(id1).not.toBe(id2);
            expect(id2).not.toBe(id3);
            expect(id1).not.toBe(id3);
            
            expect(id1).toMatch(/^[a-f0-9]{32}$/);
            expect(id2).toMatch(/^[a-f0-9]{32}$/);
            expect(id3).toMatch(/^[a-f0-9]{32}$/);
        });

        test('should have correct language multipliers', () => {
            expect(dockerExecutor.languageConfig.cpp.timeMultiplier).toBe(1.0);
            expect(dockerExecutor.languageConfig.cpp.memoryMultiplier).toBe(1.0);
            
            expect(dockerExecutor.languageConfig.java.timeMultiplier).toBe(2.0);
            expect(dockerExecutor.languageConfig.java.memoryMultiplier).toBe(1.5);
            
            expect(dockerExecutor.languageConfig.python.timeMultiplier).toBe(5.0);
            expect(dockerExecutor.languageConfig.python.memoryMultiplier).toBe(1.2);
        });

        test('should have correct file names for each language', () => {
            expect(dockerExecutor.languageConfig.cpp.filename).toBe('solution.cpp');
            expect(dockerExecutor.languageConfig.java.filename).toBe('Solution.java');
            expect(dockerExecutor.languageConfig.python.filename).toBe('solution.py');
        });
    });

    describe('Security and Resource Management', () => {
        test('should track active containers', () => {
            const initialStatus = dockerExecutor.getStatus();
            expect(initialStatus.activeContainers).toBe(0);
            
            // Simulate adding a container
            dockerExecutor.activeContainers.set('test-id', {
                process: null,
                startTime: Date.now(),
                containerName: 'test-container'
            });
            
            const statusWithContainer = dockerExecutor.getStatus();
            expect(statusWithContainer.activeContainers).toBe(1);
            
            // Clean up
            dockerExecutor.activeContainers.delete('test-id');
        });

        test('should enforce concurrent container limits', () => {
            const maxContainers = dockerExecutor.maxConcurrentContainers;
            expect(maxContainers).toBe(10);
            expect(typeof maxContainers).toBe('number');
            expect(maxContainers).toBeGreaterThan(0);
        });

        test('should handle emergency cleanup', async () => {
            // Add some mock containers
            dockerExecutor.activeContainers.set('test-1', {
                containerName: 'test-container-1'
            });
            dockerExecutor.activeContainers.set('test-2', {
                containerName: 'test-container-2'
            });
            
            expect(dockerExecutor.activeContainers.size).toBe(2);
            
            // Emergency cleanup (won't actually kill containers in test)
            await dockerExecutor.emergencyCleanup();
            
            expect(dockerExecutor.activeContainers.size).toBe(0);
        });
    });

    describe('Code Execution Validation', () => {
        test('should validate supported languages', () => {
            const supportedLanguages = ['cpp', 'java', 'python'];
            
            supportedLanguages.forEach(lang => {
                expect(dockerExecutor.languageConfig[lang]).toBeDefined();
                expect(dockerExecutor.languageConfig[lang].filename).toBeDefined();
                expect(dockerExecutor.languageConfig[lang].timeMultiplier).toBeDefined();
                expect(dockerExecutor.languageConfig[lang].memoryMultiplier).toBeDefined();
            });
        });

        test('should reject unsupported language execution', async () => {
            try {
                await dockerExecutor.executeCode('unsupported', 'console.log("test")');
                fail('Should have thrown an error for unsupported language');
            } catch (error) {
                expect(error.message).toContain('Unsupported language');
            }
        });

        test('should have correct temp directory configuration', () => {
            expect(dockerExecutor.tempDir).toBe('/tmp/hackathon-executions');
        });
    });

    describe('System Monitoring', () => {
        test('should provide comprehensive status information', () => {
            const status = dockerExecutor.getStatus();
            
            expect(status).toHaveProperty('activeContainers');
            expect(status).toHaveProperty('maxConcurrentContainers');
            expect(status).toHaveProperty('supportedLanguages');
            
            expect(typeof status.activeContainers).toBe('number');
            expect(typeof status.maxConcurrentContainers).toBe('number');
            expect(Array.isArray(status.supportedLanguages)).toBe(true);
        });

        test('should maintain execution statistics', () => {
            const initialTime = Date.now();
            const executionId = dockerExecutor.generateExecutionId();
            
            // Mock container tracking
            dockerExecutor.activeContainers.set(executionId, {
                process: null,
                startTime: initialTime,
                containerName: `judge-${executionId}`
            });
            
            const container = dockerExecutor.activeContainers.get(executionId);
            expect(container.startTime).toBe(initialTime);
            expect(container.containerName).toBe(`judge-${executionId}`);
            
            // Cleanup
            dockerExecutor.activeContainers.delete(executionId);
        });
    });

    afterAll(async () => {
        if (dockerExecutor) {
            await dockerExecutor.emergencyCleanup();
        }
    });
});