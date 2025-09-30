# Authenticity Verification System

## Overview

A blockchain-based solution for product authenticity verification using Stylus SDK. The system enables manufacturers to register their products on-chain through EIP-712 digital signature, and verify product authenticity through QR code.

## Architecture

### Smart Contract (Rust + Stylus SDK)

- **Contract Name**: `Authenticity`
- **Location**: `src/lib.rs`
- **Key Components**:
  - Manufacturer Registration
  - Signature Verification
  - Owner Management

### Project Structure

```
Authenticity/
├── src/
│   ├── lib.rs            # Main contract implementation
│   ├── utility.rs        # Utility functions and error types
│   └── verify_signature.rs # Signature verification logic
├── basic_frontend/       # Web interface for contract interaction
└── README.md
```

## Features

### For Manufacturers

- Register as an authorized manufacturer
- Manage authorized retailers
- Issue product authenticity signatures

### Security Features

- Address validation
- Duplicate name prevention
- Signature verification
- Owner-only operations

## Technical Stack

### Backend

- Rust
- Stylus SDK

### Dependencies

- `alloc`: Memory management
- `alloy_primitives`: Blockchain primitives
- `stylus_sdk`: Blockchain interaction

## Getting Started

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js and npm (for frontend)
sudo apt update
sudo apt install nodejs npm
```

### Building the Contract

```bash
git clone https://github.com/intelliDean/VeriAuth.git
```

### Generate the solidity interface like

```bash
cargo stylus export-abi
```

### Check your smart contract

```bash
 cargo stylus check
 ```

### Deploying the Contract

1. Compile the contract
2. Deploy using Stylus SDK
3. Note the deployed contract address

### Setting Up the Frontend

```bash
cd basic_frontend
npm install
npm run dev
```

## Usage

### For Developers

1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Run tests
5. Deploy contract

### For Users

1. Connect wallet
2. Register as manufacturer (if applicable)
3. Verify product authenticity
4. Manage retailer authorizations

## Testing

The project includes comprehensive tests covering:

- Manufacturer registration
- Retailer authorization
- Signature verification
- Error handling

## Security Considerations

- All transactions require wallet signatures
- Zero-address validation
- Name length validation (3-100 characters)
- Owner-only administrative functions

## Contract Link on Arbiscan:
https://sepolia.arbiscan.io/address/0x40f7d5193d026b5d270a28ed171e541a387cf56b

## Contract Frontend
https://veri-auth-swart.vercel.app/

## License

[MIT License](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Contact

For questions and support, please open an issue in the repository.

## Built by...

1. Michael Dean
2. Ebuka Moses
3. Sunday Solomon

---

_Note: This project is built on the Stylus SDK and requires appropriate blockchain network configuration._
