#!/usr/bin/env node

/**
 * Contract Address Update Script
 * Updates all integration scripts and configuration files with the provided contract addresses
 */

const fs = require('fs');
const path = require('path');
const logger = require('../backend/src/utils/logger');

// Contract addresses provided by the user
const CONTRACT_ADDRESSES = {
    bitcoinUtils: '0x03661680d36818231f7144274dcbd673d787bddea40ac11d81299da81ec824cf',
    cryptoUtils: '0x015d202687c81a2c138f3b764ead3f396c361e049119287738b223fdff7d7f77',
    spvVerifier: '0x05bf5f33d548b49b8a2f2d94f2da78ea358f6e0d4eb2a9fe741d9be4db801fe4',
    bitcoinClient: '0x048a96be5ca623256df3a0eea2f903103f9859844f2163b827fbc12b017b0299',
    bitcoinHeaders: '0x05062ab53aea2baa96b31fe73a40e2cabc6871449a5666f949c3c92a51d6b833',
    btcDepositManager: '0x01cb8f799219ff2aa63dc6b06e35a944fdb347993c102b3e7a83d8c6373f39c9',
    btcPegOut: '0x06592114e225312fbd2c8068baeb2e65b743516ef5c0829ddc45766040658e2c',
    bridge: '0x012402f9a1612d3d48bfc7beb93f756e9848f67e3a0a8c1a23d48f03a25acc9e',
    escapeHatch: '0x07e01eec5443158d9ae9c36c5df009b8b2c5e20dab34489a79a25718a409a187',
    sbtc: '0x029a051888fb8d645e4f0279393e18f95b1eacdf47b87829dd997b6264588b2c',
    operatorRegistry: '0x077d8d9f403eb1c8384acc3e7e7983d50ae9ffb64b7934d682cb2a6f83a94f13'
};

class ContractAddressUpdater {
    constructor() {
        this.updates = [];
        this.errors = [];
    }

    async updateAllAddresses() {
        logger.info('Starting contract address updates...');

        try {
            // Update backend configuration files
            await this.updateBackendConfig();

            // Update integration scripts
            await this.updateIntegrationScripts();

            // Update deployment scripts
            await this.updateDeploymentScripts();

            // Update frontend configuration if exists
            await this.updateFrontendConfig();

            this.printUpdateSummary();

        } catch (error) {
            logger.error('Failed to update contract addresses:', error);
            throw error;
        }
    }

    async updateBackendConfig() {
        logger.info('Updating backend configuration...');

        // Update default.toml
        await this.updateConfigFile(
            '../backend/config/default.toml',
            (content) => {
                let updated = content;

                for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
                    const configKey = name.charAt(0).toLowerCase() + name.slice(1).replace(/([A-Z])/g, '_$1').toLowerCase();
                    const regex = new RegExp(`(${configKey}\\s*=\\s*)"[^"]*"`, 'g');
                    updated = updated.replace(regex, `$1"${address}"`);
                }

                return updated;
            }
        );

        // Update config/index.js
        await this.updateConfigFile(
            '../backend/src/config/index.js',
            (content) => {
                let updated = content;

                for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
                    const jsKey = name.charAt(0).toLowerCase() + name.slice(1) + 'Address';
                    const regex = new RegExp(`(${jsKey}:\\s*)process\\.env\\.[^']*'([^']*)'`, 'g');
                    updated = updated.replace(regex, `$1process.env.STARKNET_${name.toUpperCase()}_ADDRESS || '${address}'`);
                }

                return updated;
            }
        );
    }

    async updateIntegrationScripts() {
        logger.info('Updating integration scripts...');

        // Update integration example
        await this.updateConfigFile(
            '../scripts/integration-example.js',
            (content) => {
                // Add contract addresses to the integration example
                const contractConfig = Object.entries(CONTRACT_ADDRESSES)
                    .map(([name, address]) => `                ${name}: '${address}'`)
                    .join(',\n');

                return content.replace(
                    'constructor() {',
                    `constructor() {
        this.contractAddresses = {
${contractConfig}
        };`
                );
            }
        );
    }

    async updateDeploymentScripts() {
        logger.info('Updating deployment scripts...');

        // Update build-contracts.js with contract addresses
        await this.updateConfigFile(
            '../scripts/build-contracts.js',
            (content) => {
                const contractList = Object.keys(CONTRACT_ADDRESSES).map(name =>
                    `                    '${name.charAt(0).toUpperCase() + name.slice(1)}'`
                ).join(',\n');

                return content.replace(
                    'deploymentOrder: \\[',
                    `deploymentOrder: [
${contractList}
                ],`
                );
            }
        );
    }

    async updateFrontendConfig() {
        logger.info('Updating frontend configuration...');

        // Check if frontend config exists and update it
        const frontendConfigPath = '../frontend/src/config/contracts.js';
        if (fs.existsSync(frontendConfigPath)) {
            await this.updateConfigFile(
                frontendConfigPath,
                (content) => {
                    let updated = content;

                    for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
                        const regex = new RegExp(`(${name}:\\s*)'[^']*'`, 'g');
                        updated = updated.replace(regex, `$1'${address}'`);
                    }

                    return updated;
                }
            );
        }
    }

    async updateConfigFile(relativePath, updateFunction) {
        try {
            const fullPath = path.join(__dirname, relativePath);

            if (!fs.existsSync(fullPath)) {
                logger.warn(`File not found: ${fullPath}`);
                return;
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            const updatedContent = updateFunction(content);

            if (content !== updatedContent) {
                fs.writeFileSync(fullPath, updatedContent);
                this.updates.push(relativePath);
                logger.info(`✓ Updated: ${relativePath}`);
            } else {
                logger.info(`- No changes needed: ${relativePath}`);
            }

        } catch (error) {
            logger.error(`Failed to update ${relativePath}:`, error);
            this.errors.push({ file: relativePath, error: error.message });
        }
    }

    printUpdateSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('CONTRACT ADDRESS UPDATE SUMMARY');
        console.log('='.repeat(60));

        console.log(`\n✅ Successfully updated ${this.updates.length} files:`);
        this.updates.forEach(file => {
            console.log(`  • ${file}`);
        });

        if (this.errors.length > 0) {
            console.log(`\n❌ ${this.errors.length} errors:`);
            this.errors.forEach(({ file, error }) => {
                console.log(`  • ${file}: ${error}`);
            });
        }

        console.log('\n📋 Contract addresses updated:');
        Object.entries(CONTRACT_ADDRESSES).forEach(([name, address]) => {
            console.log(`  • ${name}: ${address}`);
        });

        console.log('\n' + '='.repeat(60));

        if (this.errors.length === 0) {
            console.log('🎉 All contract addresses updated successfully!');
        } else {
            console.log('❌ Some files failed to update. Please check the errors above.');
        }
    }

    async generateContractMapping() {
        logger.info('Generating contract address mapping...');

        const mapping = {
            metadata: {
                generated: new Date().toISOString(),
                network: 'mainnet',
                description: 'VernWallet Bridge Contract Addresses'
            },
            contracts: CONTRACT_ADDRESSES
        };

        const mappingPath = path.join(__dirname, '../contract-addresses.json');
        fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

        logger.info(`Contract mapping saved to: ${mappingPath}`);
        return mapping;
    }
}

// Main update function
async function main() {
    try {
        const updater = new ContractAddressUpdater();
        await updater.updateAllAddresses();
        await updater.generateContractMapping();

        logger.info('Contract address update completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Contract address update failed:', error);
        process.exit(1);
    }
}

// Handle script execution
if (require.main === module) {
    main().catch((error) => {
        console.error('Update script failed:', error);
        process.exit(1);
    });
}

module.exports = { ContractAddressUpdater, CONTRACT_ADDRESSES };