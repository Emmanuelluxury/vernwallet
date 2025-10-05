/**
 * Enhanced Bridge Logger Service
 * Comprehensive logging and debugging capabilities for bridge operations
 * Provides detailed insights into bridge performance and issues
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class BridgeLoggerService {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.debugMode = process.env.NODE_ENV === 'development';
        this.logLevel = process.env.LOG_LEVEL || 'info';

        this.logStreams = new Map();
        this.operationMetrics = new Map();
        this.errorPatterns = new Map();

        this.initializeLogger();
    }

    async initializeLogger() {
        try {
            // Create logs directory if it doesn't exist
            await fs.mkdir(this.logDir, { recursive: true });

            // Initialize log streams for different types of logs
            const logTypes = ['bridge', 'bitcoin', 'starknet', 'errors', 'performance', 'debug'];
            for (const logType of logTypes) {
                const logPath = path.join(this.logDir, `${logType}.log`);
                this.logStreams.set(logType, {
                    path: logPath,
                    stream: null
                });
            }

            logger.info('Bridge logger service initialized');
        } catch (error) {
            console.error('Failed to initialize bridge logger:', error);
        }
    }

    // Enhanced logging methods
    async logBridgeOperation(operation, data, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            operation,
            data: this.sanitizeLogData(data),
            processId: process.pid,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };

        await this.writeLog('bridge', logEntry);

        if (this.debugMode || level === 'error') {
            console.log(`[${level.toUpperCase()}] Bridge ${operation}:`, data);
        }
    }

    async logBitcoinOperation(operation, data, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            operation,
            data: this.sanitizeLogData(data),
            blockchain: 'bitcoin'
        };

        await this.writeLog('bitcoin', logEntry);

        if (this.debugMode) {
            console.log(`[${level.toUpperCase()}] Bitcoin ${operation}:`, data);
        }
    }

    async logStarknetOperation(operation, data, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            operation,
            data: this.sanitizeLogData(data),
            blockchain: 'starknet'
        };

        await this.writeLog('starknet', logEntry);

        if (this.debugMode) {
            console.log(`[${level.toUpperCase()}] Starknet ${operation}:`, data);
        }
    }

    async logError(operation, error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            operation,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
                name: error.name
            },
            context: this.sanitizeLogData(context),
            processInfo: {
                pid: process.pid,
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            }
        };

        await this.writeLog('errors', errorEntry);

        // Track error patterns
        this.trackErrorPattern(operation, error);

        console.error(`[ERROR] Bridge ${operation}:`, error.message, context);
    }

    async logPerformance(operation, duration, metadata = {}) {
        const performanceEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            operation,
            duration,
            metadata: this.sanitizeLogData(metadata),
            performance: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage ? process.cpuUsage() : null
            }
        };

        await this.writeLog('performance', performanceEntry);

        // Track operation metrics
        this.trackOperationMetrics(operation, duration);
    }

    async logDebug(message, data = {}) {
        if (!this.debugMode) return;

        const debugEntry = {
            timestamp: new Date().toISOString(),
            level: 'debug',
            message,
            data: this.sanitizeLogData(data)
        };

        await this.writeLog('debug', debugEntry);
        console.log(`[DEBUG] ${message}:`, data);
    }

    // Write log entry to file
    async writeLog(logType, entry) {
        try {
            const logStream = this.logStreams.get(logType);
            if (!logStream) return;

            const logLine = JSON.stringify(entry) + '\n';

            // Ensure log file exists and is writable
            if (!logStream.stream) {
                logStream.stream = await fs.open(logStream.path, 'a');
            }

            await logStream.stream.appendFile(logLine);

        } catch (error) {
            console.error(`Failed to write ${logType} log:`, error);
        }
    }

    // Sanitize sensitive data from logs
    sanitizeLogData(data) {
        if (!data || typeof data !== 'object') return data;

        const sensitiveFields = ['privateKey', 'password', 'secret', 'mnemonic', 'seed'];
        const sanitized = { ...data };

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        // Recursively sanitize nested objects
        for (const [key, value] of Object.entries(sanitized)) {
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeLogData(value);
            }
        }

        return sanitized;
    }

    // Track error patterns for analysis
    trackErrorPattern(operation, error) {
        const patternKey = `${operation}:${error.name || 'Unknown'}`;

        if (!this.errorPatterns.has(patternKey)) {
            this.errorPatterns.set(patternKey, {
                operation,
                errorType: error.name || 'Unknown',
                count: 0,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                messages: new Set()
            });
        }

        const pattern = this.errorPatterns.get(patternKey);
        pattern.count++;
        pattern.lastSeen = new Date().toISOString();
        pattern.messages.add(error.message);
    }

    // Track operation performance metrics
    trackOperationMetrics(operation, duration) {
        if (!this.operationMetrics.has(operation)) {
            this.operationMetrics.set(operation, {
                operation,
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                averageDuration: 0,
                lastExecution: null
            });
        }

        const metrics = this.operationMetrics.get(operation);
        metrics.count++;
        metrics.totalDuration += duration;
        metrics.minDuration = Math.min(metrics.minDuration, duration);
        metrics.maxDuration = Math.max(metrics.maxDuration, duration);
        metrics.averageDuration = metrics.totalDuration / metrics.count;
        metrics.lastExecution = new Date().toISOString();
    }

    // Get error pattern analysis
    getErrorAnalysis(timeRange = 3600000) { // 1 hour default
        const cutoffTime = Date.now() - timeRange;
        const recentErrors = [];

        for (const [patternKey, pattern] of this.errorPatterns) {
            if (new Date(pattern.lastSeen).getTime() > cutoffTime) {
                recentErrors.push({
                    pattern: patternKey,
                    ...pattern,
                    uniqueMessages: pattern.messages.size
                });
            }
        }

        // Sort by frequency
        recentErrors.sort((a, b) => b.count - a.count);

        return {
            totalPatterns: recentErrors.length,
            totalErrors: recentErrors.reduce((sum, pattern) => sum + pattern.count, 0),
            patterns: recentErrors,
            timeRange,
            timestamp: new Date().toISOString()
        };
    }

    // Get performance metrics
    getPerformanceMetrics(timeRange = 3600000) {
        const cutoffTime = Date.now() - timeRange;
        const recentMetrics = [];

        for (const [operation, metrics] of this.operationMetrics) {
            if (new Date(metrics.lastExecution).getTime() > cutoffTime) {
                recentMetrics.push(metrics);
            }
        }

        // Sort by average duration (slowest first)
        recentMetrics.sort((a, b) => b.averageDuration - a.averageDuration);

        return {
            totalOperations: recentMetrics.reduce((sum, op) => sum + op.count, 0),
            operations: recentMetrics,
            timeRange,
            timestamp: new Date().toISOString()
        };
    }

    // Get comprehensive bridge statistics
    async getBridgeStatistics(timeRange = 3600000) {
        try {
            const errorAnalysis = this.getErrorAnalysis(timeRange);
            const performanceMetrics = this.getPerformanceMetrics(timeRange);

            // Read recent log entries for additional analysis
            const recentLogs = await this.getRecentLogs('bridge', timeRange);

            return {
                errorAnalysis,
                performanceMetrics,
                recentActivity: {
                    totalLogs: recentLogs.length,
                    logs: recentLogs.slice(0, 100) // Last 100 entries
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to get bridge statistics:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get recent log entries
    async getRecentLogs(logType, timeRange = 3600000) {
        try {
            const logStream = this.logStreams.get(logType);
            if (!logStream) return [];

            const cutoffTime = Date.now() - timeRange;
            const logs = [];

            // Read log file and parse recent entries
            const logContent = await fs.readFile(logStream.path, 'utf8');
            const lines = logContent.trim().split('\n');

            for (const line of lines.reverse()) { // Read from end (most recent first)
                try {
                    const entry = JSON.parse(line);
                    const entryTime = new Date(entry.timestamp).getTime();

                    if (entryTime > cutoffTime) {
                        logs.push(entry);
                    } else {
                        break; // Stop when we go past the time range
                    }
                } catch (parseError) {
                    // Skip malformed log lines
                    continue;
                }
            }

            return logs.reverse(); // Return in chronological order

        } catch (error) {
            logger.error(`Failed to get recent ${logType} logs:`, error);
            return [];
        }
    }

    // Export logs for analysis
    async exportLogs(logType, startDate, endDate) {
        try {
            const logStream = this.logStreams.get(logType);
            if (!logStream) {
                throw new Error(`Log type ${logType} not found`);
            }

            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).getTime();
            const exportedLogs = [];

            const logContent = await fs.readFile(logStream.path, 'utf8');
            const lines = logContent.trim().split('\n');

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    const entryTime = new Date(entry.timestamp).getTime();

                    if (entryTime >= startTime && entryTime <= endTime) {
                        exportedLogs.push(entry);
                    }
                } catch (parseError) {
                    continue;
                }
            }

            return {
                logType,
                startDate,
                endDate,
                totalEntries: exportedLogs.length,
                logs: exportedLogs
            };

        } catch (error) {
            logger.error(`Failed to export ${logType} logs:`, error);
            throw error;
        }
    }

    // Clean old log files
    async cleanupOldLogs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        try {
            const cutoffTime = Date.now() - maxAge;
            let cleanedFiles = 0;

            for (const [logType, logStream] of this.logStreams) {
                try {
                    const stats = await fs.stat(logStream.path);
                    const fileAge = Date.now() - stats.mtime.getTime();

                    if (fileAge > maxAge) {
                        // Create backup before cleaning
                        const backupPath = logStream.path + '.backup';
                        await fs.copyFile(logStream.path, backupPath);

                        // Truncate log file
                        await fs.truncate(logStream.path, 0);
                        cleanedFiles++;

                        logger.info(`Cleaned up ${logType} log file`);
                    }
                } catch (fileError) {
                    logger.warn(`Failed to cleanup ${logType} log:`, fileError.message);
                }
            }

            return {
                cleanedFiles,
                maxAge,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Failed to cleanup old logs:', error);
            throw error;
        }
    }

    // Health check for logging service
    async healthCheck() {
        try {
            const logDirExists = await fs.access(this.logDir).then(() => true).catch(() => false);
            const canWrite = logDirExists;

            // Test writing a log entry
            const testEntry = {
                timestamp: new Date().toISOString(),
                level: 'info',
                operation: 'health_check',
                message: 'Logger health check'
            };

            await this.writeLog('debug', testEntry);

            return {
                status: canWrite ? 'healthy' : 'degraded',
                logDirectory: this.logDir,
                logDirectoryExists: logDirExists,
                canWrite,
                debugMode: this.debugMode,
                logLevel: this.logLevel,
                activeStreams: this.logStreams.size,
                errorPatterns: this.errorPatterns.size,
                operationMetrics: this.operationMetrics.size,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Logger health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new BridgeLoggerService();