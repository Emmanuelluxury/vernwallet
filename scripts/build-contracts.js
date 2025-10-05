#!/usr/bin/env node

/**
 * Cairo Contracts Build Script
 * Compiles all Cairo contracts and generates necessary artifacts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../backend/src/utils/logger');

class ContractBuilder {
    constructor() {
        this.contractsDir = path.join(__dirname, '../contracts');
        this.targetDir = path.join(this.contractsDir, 'target');
        this.artifacts = new Map();
    }

    async initialize() {
        logger.info('Initializing contract builder...');

        // Check if Scarb is installed
        try {
            execSync('scarb --version', { stdio: 'pipe' });
        } catch (error) {
            throw new Error('Scarb is not installed. Please install it first: https://docs.swmansion.com/scarb/');
        }

        logger.info('Contract builder initialized successfully');
    }

    async buildContracts() {
        try {
            logger.info('Building Cairo contracts...');

            // Change to contracts directory
            const originalDir = process.cwd();
            process.chdir(this.contractsDir);

            try {
                // Run Scarb build
                execSync('scarb build', {
                    stdio: 'inherit',
                    env: { ...process.env, RUST_BACKTRACE: '1' }
                });

                logger.info('Contracts built successfully');

                // Parse build artifacts
                await this.parseBuildArtifacts();

            } finally {
                // Restore original directory
                process.chdir(originalDir);
            }

        } catch (error) {
            logger.error('Failed to build contracts:', error);
            throw error;
        }
    }

    async parseBuildArtifacts() {
        try {
            logger.info('Parsing build artifacts...');

            // Check if target directory exists
            if (!fs.existsSync(this.targetDir)) {
                throw new Error('Target directory not found. Build may have failed.');
            }

            // Look for compiled contracts
            const devDir = path.join(this.targetDir, 'dev');

            if (fs.existsSync(devDir)) {
                const files = fs.readdirSync(devDir);

                for (const file of files) {
                    if (file.endsWith('.contract_class.json')) {
                        const contractName = file.replace('.contract_class.json', '');
                        const artifactPath = path.join(devDir, file);

                        try {
                            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

                            this.artifacts.set(contractName, {
                                classHash: artifact.contract_class_version, // This would be the actual class hash
                                artifactPath,
                                sierra: artifact.sierra_program,
                                casm: artifact.casm_program
                            });

                            logger.info(`Parsed artifact for ${contractName}`);

                        } catch (parseError) {
                            logger.warn(`Failed to parse artifact ${file}:`, parseError.message);
                        }
                    }
                }
            }

            logger.info(`Parsed ${this.artifacts.size} contract artifacts`);

        } catch (error) {
            logger.error('Failed to parse build artifacts:', error);
            throw error;
        }
    }

    async generateABIs() {
        try {
            logger.info('Generating contract ABIs...');

            // Generate ABI files for Node.js integration
            const backendContractsDir = path.join(__dirname, '../backend/src/contracts');

            if (!fs.existsSync(backendContractsDir)) {
                fs.mkdirSync(backendContractsDir, { recursive: true });
            }

            // Generate ABI for each contract
            for (const [contractName, artifact] of this.artifacts) {
                await this.generateContractABI(contractName, artifact);
            }

            logger.info('Contract ABIs generated successfully');

        } catch (error) {
            logger.error('Failed to generate ABIs:', error);
            throw error;
        }
    }

    async generateContractABI(contractName, artifact) {
        try {
            // In a real implementation, you would extract the ABI from the compiled contract
            // For now, we'll use the ABI files we already created

            const abiPath = path.join(__dirname, `../backend/src/contracts/${contractName}.json`);

            if (fs.existsSync(abiPath)) {
                logger.info(`ABI for ${contractName} already exists`);
                return;
            }

            // Generate a basic ABI structure
            const abi = {
                name: contractName,
                type: 'cairo',
                version: '1.0.0',
                functions: [],
                events: [],
                structs: []
            };

            // Save ABI file
            fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
            logger.info(`Generated ABI for ${contractName}`);

        } catch (error) {
            logger.error(`Failed to generate ABI for ${contractName}:`, error);
        }
    }

    async generateDeploymentConfig() {
        try {
            logger.info('Generating deployment configuration...');

            const deploymentConfig = {
                network: 'starknet',
                contracts: {},
                deploymentOrder: [
                    'BitcoinHeaders',
                    'SPVVerifier',
                    'BitcoinClient',
                    'BitcoinUtils',
                    'CryptoUtils',
                    'SBTC',
                    'OperatorRegistry',
                    'BTCDepositManager',
                    'BTCPegOut',
                    'EscapeHatch',
                    'Bridge'
                ],
                dependencies: {
                    Bridge: [
                        'BitcoinHeaders',
                        'SPVVerifier',
                        'SBTC',
                        'BTCDepositManager',
                        'OperatorRegistry',
                        'BTCPegOut',
                        'EscapeHatch'
                    ],
                    BTCDepositManager: ['BitcoinHeaders', 'SPVVerifier'],
                    BTCPegOut: ['BitcoinHeaders', 'SPVVerifier'],
                    SBTC: []
                }
            };

            // Add contract artifacts to config
            for (const [name, artifact] of this.artifacts) {
                deploymentConfig.contracts[name] = {
                    classHash: artifact.classHash,
                    artifactPath: artifact.artifactPath,
                    dependencies: deploymentConfig.dependencies[name] || []
                };
            }

            const configPath = path.join(this.contractsDir, 'deployment-config.json');
            fs.writeFileSync(configPath, JSON.stringify(deploymentConfig, null, 2));

            logger.info(`Deployment config saved to: ${configPath}`);

        } catch (error) {
            logger.error('Failed to generate deployment config:', error);
            throw error;
        }
    }

    async runTests() {
        try {
            logger.info('Running contract tests...');

            // Change to contracts directory
            const originalDir = process.cwd();
            process.chdir(this.contractsDir);

            try {
                // Run Starknet Foundry tests
                execSync('snforge test', {
                    stdio: 'inherit',
                    env: { ...process.env, RUST_BACKTRACE: '1' }
                });

                logger.info('Contract tests passed successfully');

            } finally {
                // Restore original directory
                process.chdir(originalDir);
            }

        } catch (error) {
            logger.error('Contract tests failed:', error);
            throw error;
        }
    }

    async cleanBuild() {
        try {
            logger.info('Cleaning build artifacts...');

            // Change to contracts directory
            const originalDir = process.cwd();
            process.chdir(this.contractsDir);

            try {
                // Run Scarb clean
                execSync('scarb clean', { stdio: 'inherit' });
                logger.info('Build artifacts cleaned');

            } finally {
                // Restore original directory
                process.chdir(originalDir);
            }

        } catch (error) {
            logger.error('Failed to clean build:', error);
            throw error;
        }
    }

    async fullBuild() {
        try {
            logger.info('Starting full contract build process...');

            // Clean previous build
            await this.cleanBuild();

            // Build contracts
            await this.buildContracts();

            // Generate ABIs
            await this.generateABIs();

            // Generate deployment config
            await this.generateDeploymentConfig();

            // Run tests
            await this.runTests();

            logger.info('🎉 Full build process completed successfully!');

        } catch (error) {
            logger.error('Full build process failed:', error);
            throw error;
        }
    }
}

// Main build function
async function main() {
    try {
        const builder = new ContractBuilder();
        await builder.initialize();

        const command = process.argv[2] || 'build';

        switch (command) {
            case 'build':
                await builder.buildContracts();
                break;
            case 'test':
                await builder.runTests();
                break;
            case 'clean':
                await builder.cleanBuild();
                break;
            case 'full':
                await builder.fullBuild();
                break;
            default:
                console.log('Usage: node build-contracts.js [build|test|clean|full]');
                process.exit(1);
        }

    } catch (error) {
        console.error('Build script failed:', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch((error) => {
        console.error('Build script failed:', error);
        process.exit(1);
    });
}

module.exports = ContractBuilder;