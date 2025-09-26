# Authenticity Verification System

## Overview

A blockchain-based solution for product authenticity verification using Stylus SDK. The system enables manufacturers to register their products, authorize retailers, and verify product authenticity through digital signatures.

## Architecture

### Smart Contract (Rust + Stylus SDK)

- **Contract Name**: `Authenticity`
- **Location**: `src/lib.rs`
- **Key Components**:
  - Manufacturer Registration
  - Retailer Authorization
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

### For Retailers

- Connect wallet for authentication
- Verify product authenticity
- Register product ownership

### Security Features

- Address validation
- Duplicate name prevention
- Signature verification
- Owner-only operations

## Technical Stack

### Backend

- Rust
- Stylus SDK
- WASM compatibility
- No standard library (`no_std`)

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
cargo build --release
```

### Running Tests

```bash
cargo test
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

## License

[MIT License](LICENSE)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Contact

For questions and support, please open an issue in the repository.

---

_Note: This project is built on the Stylus SDK and requires appropriate blockchain network configuration._
