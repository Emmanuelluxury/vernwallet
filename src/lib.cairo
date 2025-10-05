// VernWallet Bridge Library
// Integrated Bitcoin-Starknet Bridge System

// Core interfaces for the bridge system
pub mod interfaces{
   pub mod IERC20;
   pub mod IMintable;
   pub mod ISwapper;
   pub mod IBitcoinHeaders;
   pub mod IBitcoinClient;
   pub mod IBitcoinUtils;
   pub mod ICryptoUtils;
   pub mod IBTCDepositManager;
   pub mod IBTCPegOut;
   pub mod IOperatorRegistry;
   pub mod IEscapeHatch;
}

// Core contract implementations
pub mod contracts{
   pub mod Bridge;
   pub mod BitcoinHeaders;
   pub mod BitcoinClient;
   pub mod BitcoinUtils;
   pub mod CryptoUtils;
   pub mod SPVVerifier;
   pub mod SBTC;
   pub mod BTCDepositManager;
   pub mod OperatorRegistry;
   pub mod BTCPegOut;
   pub mod EscapeHatch;
}

// Export main contracts for external use
pub use contracts::Bridge;
pub use contracts::SBTC;
pub use contracts::BTCDepositManager;
pub use contracts::BTCPegOut;
pub use contracts::OperatorRegistry;
pub use contracts::EscapeHatch;
pub use contracts::BitcoinUtils;
pub use contracts::CryptoUtils;
pub use contracts::SPVVerifier;
pub use contracts::BitcoinClient;
pub use contracts::BitcoinHeaders;

// Export key interfaces for external use
pub use interfaces::IBTCDepositManager;
pub use interfaces::IBTCPegOut;
pub use interfaces::IOperatorRegistry;
pub use interfaces::IEscapeHatch;
pub use interfaces::IBitcoinUtils;
pub use interfaces::ICryptoUtils;