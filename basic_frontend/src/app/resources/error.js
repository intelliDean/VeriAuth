/**
 * Enhanced error parser for Ethereum/smart contract errors
 * @param {Error | ethers.ContractError} error - The error object to parse
 * @returns {string} Human-readable error message
 */
const parseError = (error) => {
  // Extract error data with fallbacks
  const message = (
    error.data?.message ||
    error.error?.message ||
    error.reason ||
    error.message ||
    "Unknown error"
  ).toString();

  // Extract error data (e.g., address, name) from error.data
  const errorData = error.data?.data || error.error?.data || {};

  // Error message mapping
  const errorMap = {
    ADDRESS_ZERO: () =>
      `Invalid address: Zero address not allowed (${
        errorData.zero || "unknown"
      })`,
    NOT_REGISTERED: () =>
      `Manufacturer already registered (${errorData.user || "unknown"})`,
    ALREADY_AUTHORIZED: () =>
      `Retailer already authorized (${errorData.retailer || "unknown"})`,
    INVALID_MANUFACTURER_NAME: () =>
      `Manufacturer name must be at least 3 characters (${
        errorData.name || "unknown"
      })`,
    NAME_NOT_AVAILABLE: () =>
      `Manufacturer name is already taken (${errorData.name || "unknown"})`,
    DOES_NOT_EXIST: () =>
      `Manufacturer does not exist (${errorData.address || "unknown"})`,
    ONLY_OWNER: () =>
      `Only contract owner can perform this action (${
        errorData.user || "unknown"
      })`,
    UNAUTHORISED: () => `Unauthorized operation (${errorData[0] || "unknown"})`,
    CLAIM_FAILED: () => "Ownership claim failed",
    INVALID_SIGNATURE: () => "Invalid signature - authentication failed",
    EC_RECOVER_CALL_ERROR: () => "Signature recovery failed",
    // Common Ethereum errors
    "user rejected transaction": () => "Transaction was canceled by user",
    "insufficient funds": () => "Insufficient funds for transaction",
    "nonce too low": () => "Network error - please try again",
    "gas limit exceeded": () => "Transaction requires more gas than allowed",
    "execution reverted": () => "Transaction reverted by smart contract",
  };

  // Check for matching error keys (case-insensitive)
  for (const [key, getMessage] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return getMessage();
    }
  }

  // Handle JSON-RPC error codes
  if (error.code) {
    switch (error.code) {
      case 4001:
        return "Transaction rejected by user";
      case -32603:
        return "Network issue: Circuit breaker open. Try refreshing or switching to a reliable RPC (e.g., Alchemy).";
      case -32000:
        return "Invalid input parameters";
    }
  }

  // Fallback: Return cleaned message
  return message.replace(/^error:/i, "").trim() || "An unknown error occurred";
};

export default parseError;

function addressZero() {
  return "0x0000000000000000000000000000000000000000";
}

export { addressZero, parseError };

