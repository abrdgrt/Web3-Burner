# 🔥 Web3 Balance Burner

> **Emergency wallet drainer for compromised blockchain wallets**

A high-performance, configurable Node.js tool designed to automatically drain cryptocurrency wallets in emergency situations when a wallet has been compromised. Built with speed and reliability in mind.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)
[![ethers.js](https://img.shields.io/badge/ethers.js-v5.7.2-blue)](https://docs.ethers.io/v5/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Use Cases](#use-cases)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Security Considerations](#security-considerations)
- [Network Support](#network-support)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

## 🎯 Overview

Web3 Balance Burner is a specialized security tool for draining compromised Ethereum-compatible wallets. When you suspect a wallet's private key has been exposed, this tool rapidly transfers all remaining funds to a secure backup wallet before malicious actors can steal them.

### Why This Tool?

When a wallet is compromised, every second counts. Attackers often use automated scripts to drain wallets instantly. This tool provides:

- ⚡ **Speed**: Optimized gas settings and real-time monitoring
- 🔄 **Flexibility**: WebSocket or HTTP polling modes
- 🎯 **Reliability**: Automatic retry logic and fallback mechanisms
- 🛡️ **Security**: Environment-based configuration, no hardcoded keys

## ✨ Features

### Core Capabilities

- **Real-time Monitoring**: WebSocket-based block monitoring for instant detection
- **Automatic Draining**: Automatically burns balance when threshold is exceeded
- **Optimized Gas Pricing**: Configurable gas multipliers for priority transactions
- **Batch Operations**: Support for multiple simultaneous transfers
- **Emergency Mode**: Ultra-fast draining with maximum gas settings
- **Multi-Network Support**: Compatible with Ethereum, Polygon, BSC, Arbitrum, and more

### Technical Features

- 🚀 **WebSocket & HTTP Polling**: Choose between real-time or interval-based monitoring
- ⚙️ **Configurable Parameters**: Full control via `.env` file
- 🔄 **Automatic Retry Logic**: Handles nonce conflicts and network issues
- 📊 **Network Statistics**: Real-time blockchain and wallet information
- 🎛️ **CLI Interface**: Interactive mode for manual control
- 🔐 **Secure Configuration**: Environment variable-based secrets management

## 🎬 Use Cases

### Legitimate Security Scenarios

1. **Compromised Private Key**: Immediately drain wallet to secure address
2. **Phishing Attack Recovery**: Quick response to suspected key exposure
3. **Hardware Wallet Backup**: Automated fund protection during device issues
4. **Smart Contract Exit**: Rapid withdrawal from vulnerable contracts
5. **Testing & Development**: Simulate emergency fund recovery procedures

> **⚠️ Important**: This tool is designed for legitimate security purposes only. Always ensure you have proper authorization to access any wallet you're draining.

## 📦 Installation

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn
- Blockchain RPC endpoint (Infura, Alchemy, or similar)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/yourusername/web3-balance-burner.git
cd web3-balance-burner

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Dependencies

```json
{
  "ethers": "^5.7.2",
  "ws": "^8.14.2",
  "dotenv": "^16.3.1",
  "readline": "^1.3.0"
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# Network Configuration
RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
WS_URL=wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY
CHAIN_ID=1

# Wallet Configuration
PRIVATE_KEY=your_private_key_here_without_0x
TARGET_ADDRESS=0xYourSecureWalletAddress

# Monitoring Settings
USE_WEBSOCKET=true
RECHECK_INTERVAL=3000
BURN_THRESHOLD=0.001

# Gas Optimization
GAS_MULTIPLIER=1.5
MAX_GAS_PRICE=300

# Security Settings
MINIMUM_BALANCE=0.001

# Performance
BATCH_SIZE=5
CONFIRMATION_TIMEOUT=30000
```

### Configuration Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| `RPC_URL` | Blockchain RPC endpoint | *Required* | Any valid URL |
| `WS_URL` | WebSocket endpoint | Optional | Any valid WSS URL |
| `PRIVATE_KEY` | Compromised wallet key | *Required* | 64 hex chars |
| `TARGET_ADDRESS` | Secure destination | *Required* | Valid address |
| `USE_WEBSOCKET` | Enable real-time mode | `true` | true/false |
| `RECHECK_INTERVAL` | Polling frequency (ms) | `3000` | 1000-30000 |
| `GAS_MULTIPLIER` | Gas price boost | `1.5` | 1.0-5.0 |
| `MAX_GAS_PRICE` | Gas price cap (Gwei) | `300` | 50-1000 |
| `BURN_THRESHOLD` | Auto-burn trigger (ETH) | `0.001` | 0.0001-10 |

## 🚀 Usage

### 1. Automatic Monitoring Mode

Start continuous monitoring that automatically burns funds when detected:

```bash
npm start
# or
node balance_burner.js
```

**Output:**
```
🚀 Starting Web3 Balance Burner...

🔌 Connecting to blockchain...
✅ Connected to network: homestead (Chain ID: 1)
🔑 Wallet loaded: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
💰 Current balance: 0.5 ETH

👀 Starting balance monitoring...
🔌 Using WebSocket monitoring (real-time block updates)
✅ WebSocket monitoring active

✅ Balance burner is now active!
Press Ctrl+C to stop
```

### 2. Interactive CLI Mode

Launch interactive menu for manual control:

```bash
npm run cli
# or
node balance_burner.js --cli
```

**Menu Options:**
```
📋 Available commands:
1. Check balance
2. Single burn
3. Start monitoring
4. Stop monitoring
5. Emergency burn
6. Network stats
7. Exit
```

### 3. Emergency Burn

For immediate, maximum-speed draining:

```javascript
const { BalanceBurner } = require('./balance_burner');

async function emergencyDrain() {
    const burner = new BalanceBurner();
    await burner.initialize();
    await burner.setWallet('your_private_key');
    await burner.emergencyBurnAll('0xYourSecureWallet');
}

emergencyDrain();
```

### 4. Programmatic Usage

```javascript
const { BalanceBurner } = require('./balance_burner');

async function customBurn() {
    // Initialize with custom config
    const burner = new BalanceBurner({
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
        gasMultiplier: 2.0,
        recheckInterval: 2000
    });
    
    await burner.initialize();
    burner.setWallet('your_private_key');
    
    // Start monitoring
    burner.startMonitoring('0xTargetAddress', {
        threshold: ethers.utils.parseEther('0.01')
    });
    
    // Or execute single burn
    await burner.executeBurn('0xTargetAddress', {
        waitForConfirmation: true
    });
}
```

## 🔒 Security Considerations

### Best Practices

1. **Never Commit `.env`**: Always add `.env` to `.gitignore`
2. **Use Separate Wallets**: Don't use your main wallet's private key
3. **Test on Testnets**: Verify configuration on Goerli/Sepolia first
4. **Secure Storage**: Encrypt `.env` file when not in use
5. **Monitor Logs**: Keep track of all transactions
6. **Backup Configuration**: Store secure copies of your config

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Private keys are never hardcoded
- [ ] Target address is verified and controlled by you
- [ ] Testing completed on testnet
- [ ] Gas price limits configured appropriately
- [ ] Emergency contacts established
- [ ] Backup RPC endpoints configured

### Risk Mitigation

```env
# Set conservative gas limits
MAX_GAS_PRICE=300

# Use minimum viable threshold
BURN_THRESHOLD=0.001

# Enable confirmation waiting
CONFIRMATION_TIMEOUT=30000

# Use multiple fallback RPCs
BACKUP_RPC_URL_1=https://rpc.ankr.com/eth
```

## 🌐 Network Support

### Supported Networks

| Network | Chain ID | RPC URL Example |
|---------|----------|-----------------|
| Ethereum Mainnet | 1 | `https://mainnet.infura.io/v3/KEY` |
| Ethereum Goerli | 5 | `https://goerli.infura.io/v3/KEY` |
| Ethereum Sepolia | 11155111 | `https://sepolia.infura.io/v3/KEY` |
| Polygon Mainnet | 137 | `https://polygon-mainnet.infura.io/v3/KEY` |
| Polygon Mumbai | 80001 | `https://polygon-mumbai.infura.io/v3/KEY` |
| BSC Mainnet | 56 | `https://bsc-dataseed1.binance.org` |
| BSC Testnet | 97 | `https://data-seed-prebsc-1-s1.binance.org:8545` |
| Arbitrum One | 42161 | `https://arb1.arbitrum.io/rpc` |
| Arbitrum Goerli | 421613 | `https://goerli-rollup.arbitrum.io/rpc` |
| Optimism | 10 | `https://mainnet.optimism.io` |
| Avalanche C-Chain | 43114 | `https://api.avax.network/ext/bc/C/rpc` |

### Network Configuration

```env
# Ethereum Mainnet
RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
CHAIN_ID=1

# Polygon Mainnet
RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
CHAIN_ID=137

# BSC Mainnet
RPC_URL=https://bsc-dataseed1.binance.org
CHAIN_ID=56
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Errors

**Problem**: `Failed to connect to RPC endpoint`

**Solution**:
```bash
# Verify RPC URL is correct
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $RPC_URL

# Try alternative RPC provider
RPC_URL=https://rpc.ankr.com/eth
```

#### 2. Insufficient Gas

**Problem**: `Insufficient funds for transaction`

**Solution**:
```env
# Reduce gas multiplier
GAS_MULTIPLIER=1.2

# Lower maximum gas price
MAX_GAS_PRICE=150
```

#### 3. WebSocket Timeout

**Problem**: `WebSocket connection timeout`

**Solution**:
```env
# Disable WebSocket, use HTTP polling
USE_WEBSOCKET=false
RECHECK_INTERVAL=5000
```

#### 4. Nonce Issues

**Problem**: `Nonce too low` or `Nonce expired`

**Solution**: The tool automatically retries with updated nonce. If persistent:
```javascript
// Clear pending transactions
await provider.getTransactionCount(address, 'pending');
```

### Debug Mode

Enable detailed logging:

```bash
# Set environment variable
export DEBUG=true

# Run with logging
node balance_burner.js 2>&1 | tee burner.log
```

### Getting Help

1. Check the [Issues](https://github.com/yourusername/web3-balance-burner/issues) page
2. Review [Configuration](#configuration) section
3. Test on testnet first
4. Verify all environment variables are set

## 📊 Performance Metrics

### Speed Comparison

| Mode | Detection Time | Execution Time | Total Time |
|------|---------------|----------------|------------|
| WebSocket | ~1 second | 5-15 seconds | 6-16 seconds |
| HTTP Poll (3s) | ~3 seconds | 5-15 seconds | 8-18 seconds |
| HTTP Poll (1s) | ~1 second | 5-15 seconds | 6-16 seconds |
| Emergency Mode | Immediate | 3-8 seconds | 3-8 seconds |

### Gas Optimization

```env
# Normal speed (cheaper)
GAS_MULTIPLIER=1.2
MAX_GAS_PRICE=100

# Fast (balanced)
GAS_MULTIPLIER=1.5
MAX_GAS_PRICE=200

# Ultra-fast (expensive)
GAS_MULTIPLIER=2.5
MAX_GAS_PRICE=500

# Emergency (maximum speed)
EMERGENCY_GAS_MULTIPLIER=3.0
EMERGENCY_MAX_GAS_PRICE=1000
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/web3-balance-burner.git
cd web3-balance-burner

# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint
```

### Contribution Areas

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Web3 Balance Burner Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

## ⚠️ Disclaimer

**IMPORTANT LEGAL NOTICE:**

This software is provided for **legitimate security purposes only**. Users are solely responsible for:

- ✅ Ensuring they have authorization to access any wallets
- ✅ Complying with all applicable laws and regulations
- ✅ Understanding the risks of blockchain transactions
- ✅ Securing their private keys and configuration files

**The authors and contributors:**
- ❌ Do NOT endorse unauthorized access to wallets
- ❌ Are NOT responsible for misuse of this tool
- ❌ Provide NO warranty or guarantee of functionality
- ❌ Are NOT liable for any losses incurred

**Use at your own risk. This tool involves cryptocurrency transactions which are irreversible.**

### Ethical Use Only

This tool should only be used for:
- Recovering funds from your own compromised wallets
- Authorized security testing and research
- Educational purposes in controlled environments
- Legitimate emergency fund protection

Any other use is strictly prohibited and may be illegal.

## 📞 Support

- 📧 Email: support@example.com
- 💬 Discord: [Join our server](https://discord.gg/example)
- 🐦 Twitter: [@web3burner](https://twitter.com/web3burner)
- 📖 Documentation: [Full docs](https://docs.example.com)

---

**Built with ❤️ by the Web3 Security Community**

*Last updated: 2024*
