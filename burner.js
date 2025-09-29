const { ethers } = require('ethers');
const WebSocket = require('ws');
const readline = require('readline');
require('dotenv').config();

class BalanceBurner {
    constructor(config = {}) {
        // Load configuration from environment variables with fallbacks
        this.config = {
            // Network configuration
            rpcUrl: config.rpcUrl || process.env.RPC_URL || process.env.MAINNET_RPC_URL,
            wsUrl: config.wsUrl || process.env.WS_URL || process.env.MAINNET_WS_URL,
            chainId: config.chainId || parseInt(process.env.CHAIN_ID || '1'),
            
            // Monitoring configuration
            recheckInterval: config.recheckInterval || parseInt(process.env.RECHECK_INTERVAL || '3000'),
            useWebSocket: config.useWebSocket !== undefined ? config.useWebSocket : (process.env.USE_WEBSOCKET === 'true' || !process.env.USE_WEBSOCKET),
            
            // Gas optimization
            gasMultiplier: config.gasMultiplier || parseFloat(process.env.GAS_MULTIPLIER || '1.5'),
            maxGasPrice: config.maxGasPrice || ethers.utils.parseUnits(process.env.MAX_GAS_PRICE || '200', 'gwei'),
            
            // Security
            minimumBalance: config.minimumBalance || ethers.utils.parseEther(process.env.MINIMUM_BALANCE || '0.001'),
            burnThreshold: config.burnThreshold || ethers.utils.parseEther(process.env.BURN_THRESHOLD || '0.001'),
            
            // Performance
            batchSize: config.batchSize || parseInt(process.env.BATCH_SIZE || '5'),
            confirmationTimeout: config.confirmationTimeout || parseInt(process.env.CONFIRMATION_TIMEOUT || '30000'),
            
            // Wallet configuration
            privateKey: config.privateKey || process.env.PRIVATE_KEY,
            targetAddress: config.targetAddress || process.env.TARGET_ADDRESS || process.env.SECURE_WALLET_ADDRESS,
        };
        
        this.provider = null;
        this.wallet = null;
        this.wsProvider = null;
        this.isMonitoring = false;
        this.isEmergencyMode = false;
        this.pendingTxs = new Map();
        this.pollInterval = null;
    }
    
    async initialize() {
        try {
            // Validate required environment variables
            this.validateConfig();
            
            // Initialize HTTP provider
            console.log('🔌 Connecting to blockchain...');
            this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
            
            // Test connection
            const network = await this.provider.getNetwork();
            console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
            
            // Initialize WebSocket provider if enabled
            if (this.config.useWebSocket && this.config.wsUrl) {
                try {
                    this.wsProvider = new ethers.providers.WebSocketProvider(this.config.wsUrl);
                    console.log('✅ WebSocket provider initialized');
                } catch (error) {
                    console.warn('⚠️ WebSocket initialization failed, falling back to HTTP polling:', error.message);
                    this.config.useWebSocket = false;
                }
            }
            
            // Initialize wallet
            if (this.config.privateKey) {
                this.setWallet(this.config.privateKey);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }
    
    validateConfig() {
        if (!this.config.rpcUrl) {
            throw new Error('RPC_URL is required in .env file');
        }
        
        if (this.config.useWebSocket && !this.config.wsUrl) {
            console.warn('⚠️ WebSocket enabled but WS_URL not provided, falling back to HTTP polling');
            this.config.useWebSocket = false;
        }
        
        if (!this.config.privateKey) {
            console.warn('⚠️ PRIVATE_KEY not set in .env file');
        }
        
        if (!this.config.targetAddress) {
            console.warn('⚠️ TARGET_ADDRESS not set in .env file');
        }
    }
    
    setWallet(privateKey = null) {
        try {
            const key = privateKey || this.config.privateKey;
            if (!key) {
                throw new Error('Private key not provided');
            }
            
            // Add 0x prefix if not present
            const formattedKey = key.startsWith('0x') ? key : `0x${key}`;
            
            this.wallet = new ethers.Wallet(formattedKey, this.provider);
            console.log(`🔑 Wallet loaded: ${this.wallet.address}`);
            return true;
        } catch (error) {
            console.error('❌ Invalid private key:', error.message);
            return false;
        }
    }
    
    async getBalance() {
        if (!this.wallet) throw new Error('Wallet not initialized');
        return await this.provider.getBalance(this.wallet.address);
    }
    
    async getOptimalGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            let gasPrice = feeData.gasPrice || ethers.utils.parseUnits('20', 'gwei');
            
            // Apply multiplier for speed
            let optimizedPrice = gasPrice.mul(Math.floor(this.config.gasMultiplier * 100)).div(100);
            
            // Cap at maximum
            if (optimizedPrice.gt(this.config.maxGasPrice)) {
                optimizedPrice = this.config.maxGasPrice;
            }
            
            return optimizedPrice;
        } catch (error) {
            console.warn('⚠️ Failed to get gas price, using fallback');
            return ethers.utils.parseUnits('20', 'gwei');
        }
    }
    
    async estimateGasForTransfer(to, amount) {
        try {
            return await this.wallet.estimateGas({
                to: to,
                value: amount
            });
        } catch (error) {
            return ethers.BigNumber.from('21000');
        }
    }
    
    async createBurnTransaction(targetAddress) {
        const balance = await this.getBalance();
        const gasPrice = await this.getOptimalGasPrice();
        const gasLimit = ethers.BigNumber.from('21000'); // Standard transfer
        
        // Calculate gas cost
        const gasCost = gasLimit.mul(gasPrice);
        
        // Calculate amount to send (balance - gas cost)
        const amountToSend = balance.sub(gasCost);
        
        if (amountToSend.lte(0)) {
            throw new Error('Insufficient balance to cover gas costs');
        }
        
        return {
            to: targetAddress,
            value: amountToSend,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            nonce: await this.wallet.getTransactionCount('pending')
        };
    }
    
    async executeBurn(targetAddress = null, options = {}) {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        const target = targetAddress || this.config.targetAddress;
        if (!target) throw new Error('Target address not provided');
        
        console.log(`\n🔥 Executing balance burn to ${target}`);
        
        try {
            const balance = await this.getBalance();
            console.log(`💰 Current balance: ${ethers.utils.formatEther(balance)} ETH`);
            
            if (balance.lte(this.config.minimumBalance)) {
                console.log('⚠️ Balance too low to burn');
                return null;
            }
            
            const txData = await this.createBurnTransaction(target);
            
            console.log(`📤 Sending ${ethers.utils.formatEther(txData.value)} ETH`);
            console.log(`⛽ Gas Price: ${ethers.utils.formatUnits(txData.gasPrice, 'gwei')} Gwei`);
            console.log(`🏗️ Gas Limit: ${txData.gasLimit.toString()}`);
            console.log(`🔢 Nonce: ${txData.nonce}`);
            
            // Send transaction
            const tx = await this.wallet.sendTransaction(txData);
            console.log(`✅ Transaction sent: ${tx.hash}`);
            
            // Track pending transaction
            this.pendingTxs.set(tx.hash, {
                timestamp: Date.now(),
                amount: txData.value,
                targetAddress: target
            });
            
            if (options.waitForConfirmation) {
                console.log('⏳ Waiting for confirmation...');
                const receipt = await tx.wait();
                console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
                console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
                this.pendingTxs.delete(tx.hash);
                return receipt;
            }
            
            return tx;
        } catch (error) {
            console.error('❌ Burn transaction failed:', error.message);
            if (error.code === 'INSUFFICIENT_FUNDS') {
                console.error('💸 Insufficient funds for transaction');
            } else if (error.code === 'NONCE_EXPIRED') {
                console.error('🔄 Nonce expired, retrying...');
                return await this.executeBurn(target, options);
            }
            throw error;
        }
    }
    
    async batchBurn(targetAddresses, options = {}) {
        console.log(`🔥 Starting batch burn to ${targetAddresses.length} addresses`);
        
        const results = [];
        const chunks = this.chunkArray(targetAddresses, this.config.batchSize);
        
        for (const chunk of chunks) {
            const promises = chunk.map(async (address, index) => {
                try {
                    await new Promise(resolve => setTimeout(resolve, index * 100));
                    return await this.executeBurn(address, options);
                } catch (error) {
                    console.error(`❌ Failed to burn to ${address}:`, error.message);
                    return null;
                }
            });
            
            const batchResults = await Promise.allSettled(promises);
            results.push(...batchResults);
            
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }
    
    startMonitoring(targetAddress = null, options = {}) {
        if (this.isMonitoring) {
            console.log('⚠️ Already monitoring');
            return;
        }
        
        const target = targetAddress || this.config.targetAddress;
        if (!target) {
            console.error('❌ Target address not provided for monitoring');
            return;
        }
        
        this.isMonitoring = true;
        console.log('\n👀 Starting balance monitoring...');
        console.log(`🎯 Target address: ${target}`);
        console.log(`🔔 Threshold: ${ethers.utils.formatEther(options.threshold || this.config.burnThreshold)} ETH`);
        
        if (this.config.useWebSocket && this.wsProvider) {
            this.startWebSocketMonitoring(target, options);
        } else {
            this.startPollingMonitoring(target, options);
        }
    }
    
    startWebSocketMonitoring(targetAddress, options = {}) {
        console.log('🔌 Using WebSocket monitoring (real-time block updates)');
        
        try {
            const wsWallet = new ethers.Wallet(this.wallet.privateKey, this.wsProvider);
            
            this.wsProvider.on('block', async (blockNumber) => {
                if (!this.isMonitoring) return;
                
                try {
                    console.log(`📦 New block: ${blockNumber}`);
                    const balance = await wsWallet.getBalance();
                    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
                    
                    await this.checkAndBurn(targetAddress, options);
                } catch (error) {
                    console.error('❌ Monitoring error:', error.message);
                }
            });
            
            console.log('✅ WebSocket monitoring active');
        } catch (error) {
            console.error('❌ WebSocket monitoring failed:', error.message);
            console.log('🔄 Falling back to HTTP polling...');
            this.config.useWebSocket = false;
            this.startPollingMonitoring(targetAddress, options);
        }
    }
    
    startPollingMonitoring(targetAddress, options = {}) {
        console.log(`🔄 Using HTTP polling every ${this.config.recheckInterval}ms`);
        
        const poll = async () => {
            if (!this.isMonitoring) {
                if (this.pollInterval) {
                    clearTimeout(this.pollInterval);
                }
                return;
            }
            
            try {
                const balance = await this.getBalance();
                const blockNumber = await this.provider.getBlockNumber();
                console.log(`📦 Block: ${blockNumber} | 💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
                
                await this.checkAndBurn(targetAddress, options);
            } catch (error) {
                console.error('❌ Monitoring error:', error.message);
            }
            
            this.pollInterval = setTimeout(poll, this.config.recheckInterval);
        };
        
        poll();
        console.log('✅ HTTP polling active');
    }
    
    async checkAndBurn(targetAddress, options = {}) {
        const balance = await this.getBalance();
        const threshold = options.threshold || this.config.burnThreshold;
        
        if (balance.gt(threshold)) {
            console.log(`\n🚨 Balance above threshold! Triggering burn...`);
            await this.executeBurn(targetAddress, { waitForConfirmation: true });
        }
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.pollInterval) {
            clearTimeout(this.pollInterval);
            this.pollInterval = null;
        }
        
        if (this.wsProvider) {
            this.wsProvider.removeAllListeners();
        }
        
        console.log('\n⏹️ Monitoring stopped');
    }
    
    async emergencyBurnAll(targetAddress = null) {
        console.log('\n🚨🚨🚨 EMERGENCY BURN MODE ACTIVATED 🚨🚨🚨');
        this.isEmergencyMode = true;
        
        const target = targetAddress || this.config.targetAddress;
        if (!target) {
            throw new Error('Target address not provided for emergency burn');
        }
        
        try {
            this.stopMonitoring();
            
            // Use higher gas multiplier for emergency
            const originalMultiplier = this.config.gasMultiplier;
            this.config.gasMultiplier = parseFloat(process.env.EMERGENCY_GAS_MULTIPLIER || '3.0');
            
            await this.executeBurn(target, { waitForConfirmation: true });
            
            // Restore original multiplier
            this.config.gasMultiplier = originalMultiplier;
            
            console.log('✅ Emergency burn completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Emergency burn failed:', error.message);
            throw error;
        } finally {
            this.isEmergencyMode = false;
        }
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    async getNetworkStats() {
        const network = await this.provider.getNetwork();
        const feeData = await this.provider.getFeeData();
        const blockNumber = await this.provider.getBlockNumber();
        
        return {
            network: network.name,
            chainId: network.chainId,
            currentBlock: blockNumber,
            gasPrice: ethers.utils.formatUnits(feeData.gasPrice || 0, 'gwei') + ' Gwei',
            balance: this.wallet ? ethers.utils.formatEther(await this.getBalance()) + ' ETH' : 'N/A',
            walletAddress: this.wallet ? this.wallet.address : 'N/A'
        };
    }
    
    getPendingTransactions() {
        return Array.from(this.pendingTxs.entries()).map(([hash, data]) => ({
            hash,
            ...data,
            age: Date.now() - data.timestamp
        }));
    }
}

// CLI Interface
class BalanceBurnerCLI {
    constructor() {
        this.burner = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async start() {
        console.log('\n🔥 Web3 Balance Burner v1.0');
        console.log('===============================\n');
        
        try {
            this.burner = new BalanceBurner();
            await this.burner.initialize();
            
            if (!this.burner.wallet) {
                console.log('⚠️ Wallet not initialized. Please configure PRIVATE_KEY in .env');
            }
            
            await this.showMenu();
        } catch (error) {
            console.error('❌ Failed to start:', error.message);
            process.exit(1);
        }
    }
    
    showMenu() {
        return new Promise((resolve) => {
            console.log('\n📋 Available commands:');
            console.log('1. Check balance');
            console.log('2. Single burn');
            console.log('3. Start monitoring');
            console.log('4. Stop monitoring');
            console.log('5. Emergency burn');
            console.log('6. Network stats');
            console.log('7. Exit');
            
            this.rl.question('\n👉 Select option: ', async (answer) => {
                await this.handleCommand(answer.trim());
                resolve();
            });
        });
    }
    
    async handleCommand(command) {
        try {
            switch (command) {
                case '1':
                    await this.checkBalance();
                    break;
                case '2':
                    await this.singleBurn();
                    break;
                case '3':
                    await this.startMonitoring();
                    break;
                case '4':
                    this.burner.stopMonitoring();
                    break;
                case '5':
                    await this.emergencyBurn();
                    break;
                case '6':
                    await this.showStats();
                    break;
                case '7':
                    console.log('\n👋 Goodbye!');
                    this.burner.stopMonitoring();
                    process.exit(0);
                    break;
                default:
                    console.log('❌ Invalid option');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        
        await this.showMenu();
    }
    
    async checkBalance() {
        if (!this.burner.wallet) {
            console.log('❌ Wallet not initialized');
            return;
        }
        
        const balance = await this.burner.getBalance();
        console.log(`\n💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);
        console.log(`📍 Address: ${this.burner.wallet.address}`);
    }
    
    async singleBurn() {
        if (!this.burner.wallet) {
            console.log('❌ Wallet not initialized');
            return;
        }
        
        return new Promise((resolve) => {
            this.rl.question('🎯 Target address (or press Enter for default): ', async (address) => {
                const target = address.trim() || this.burner.config.targetAddress;
                if (!target) {
                    console.log('❌ No target address provided');
                    resolve();
                    return;
                }
                
                try {
                    await this.burner.executeBurn(target, { waitForConfirmation: true });
                } catch (error) {
                    console.error('❌ Burn failed:', error.message);
                }
                resolve();
            });
        });
    }
    
    async startMonitoring() {
        if (!this.burner.wallet) {
            console.log('❌ Wallet not initialized');
            return;
        }
        
        const target = this.burner.config.targetAddress;
        if (!target) {
            console.log('❌ TARGET_ADDRESS not configured in .env');
            return;
        }
        
        this.burner.startMonitoring(target);
        console.log('\n✅ Monitoring started. Use option 4 to stop.');
    }
    
    async emergencyBurn() {
        if (!this.burner.wallet) {
            console.log('❌ Wallet not initialized');
            return;
        }
        
        return new Promise((resolve) => {
            this.rl.question('⚠️ EMERGENCY BURN - Are you sure? (yes/no): ', async (answer) => {
                if (answer.toLowerCase() !== 'yes') {
                    console.log('❌ Emergency burn cancelled');
                    resolve();
                    return;
                }
                
                try {
                    await this.burner.emergencyBurnAll();
                } catch (error) {
                    console.error('❌ Emergency burn failed:', error.message);
                }
                resolve();
            });
        });
    }
    
    async showStats() {
        const stats = await this.burner.getNetworkStats();
        console.log('\n📊 Network Statistics:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Network:       ${stats.network}`);
        console.log(`Chain ID:      ${stats.chainId}`);
        console.log(`Current Block: ${stats.currentBlock}`);
        console.log(`Gas Price:     ${stats.gasPrice}`);
        console.log(`Wallet:        ${stats.walletAddress}`);
        console.log(`Balance:       ${stats.balance}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
}

// Main execution function
async function main() {
    console.log('\n🚀 Starting Web3 Balance Burner...\n');
    
    try {
        const burner = new BalanceBurner();
        await burner.initialize();
        
        if (!burner.wallet) {
            console.error('❌ PRIVATE_KEY not configured in .env file');
            console.log('💡 Please set PRIVATE_KEY in your .env file and try again');
            process.exit(1);
        }
        
        const targetAddress = burner.config.targetAddress;
        if (!targetAddress) {
            console.error('❌ TARGET_ADDRESS not configured in .env file');
            console.log('💡 Please set TARGET_ADDRESS in your .env file and try again');
            process.exit(1);
        }
        
        // Display initial stats
        const stats = await burner.getNetworkStats();
        console.log('📊 Configuration:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Network:       ${stats.network} (Chain ${stats.chainId})`);
        console.log(`Wallet:        ${stats.walletAddress}`);
        console.log(`Balance:       ${stats.balance}`);
        console.log(`Target:        ${targetAddress}`);
        console.log(`Mode:          ${burner.config.useWebSocket ? 'WebSocket' : 'HTTP Polling'}`);
        console.log(`Interval:      ${burner.config.recheckInterval}ms`);
        console.log(`Gas Multiplier: ${burner.config.gasMultiplier}x`);
        console.log(`Threshold:     ${ethers.utils.formatEther(burner.config.burnThreshold)} ETH`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        
        // Start monitoring
        burner.startMonitoring(targetAddress);
        
        console.log('✅ Balance burner is now active!');
        console.log('Press Ctrl+C to stop\n');
        
        // Store global reference
        global.activeBurner = burner;
        
    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Ensure your .env file exists and is configured correctly');
        console.log('2. Check that RPC_URL is valid and accessible');
        console.log('3. Verify PRIVATE_KEY is set (without 0x prefix)');
        console.log('4. Confirm TARGET_ADDRESS is set (with 0x prefix)');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    if (global.activeBurner) {
        global.activeBurner.stopMonitoring();
    }
    console.log('👋 Goodbye!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down...');
    if (global.activeBurner) {
        global.activeBurner.stopMonitoring();
    }
    process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error.message);
    if (global.activeBurner) {
        global.activeBurner.stopMonitoring();
    }
});

// Run based on execution context
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--cli') || args.includes('-c')) {
        // CLI mode
        const cli = new BalanceBurnerCLI();
        cli.start().catch(error => {
            console.error('❌ CLI Error:', error.message);
            process.exit(1);
        });
    } else {
        // Automatic monitoring mode
        main().catch(error => {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        });
    }
}

module.exports = { BalanceBurner, BalanceBurnerCLI };
