import { useState, useEffect } from "react";
import { ethers } from "ethers";

const Counter = () => {
  const [currentNumber, setCurrentNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [activeTab, setActiveTab] = useState("counter");

  // Contract ABI - UPDATED with both parameters
  const CONTRACT_ABI = [
    {
      inputs: [
        {
          internalType: "address",
          name: "manu_addr",
          type: "address",
        },
        {
          internalType: "string",
          name: "manu_name",
          type: "string",
        },
      ],
      name: "manufacturerRegisters",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "number",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "new_number",
          type: "uint256",
        },
      ],
      name: "setNumber",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "new_number",
          type: "uint256",
        },
      ],
      name: "mulNumber",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "new_number",
          type: "uint256",
        },
      ],
      name: "addNumber",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "increment",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "addFromMsgValue",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ];

  // Replace with your actual contract address
  const CONTRACT_ADDRESS = "0x4537136c88deaaef93952678cf339e1acbdcfc49";

  // Create provider with ENS disabled
  const createProvider = () => {
    if (typeof window.ethereum !== "undefined") {
      return new ethers.BrowserProvider(window.ethereum, "any", {
        ensAddress: null,
        ensNetwork: null,
      });
    }
    return null;
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const web3Provider = createProvider();
        if (!web3Provider) {
          throw new Error("Failed to create provider");
        }

        const web3Signer = await web3Provider.getSigner();
        const userAddress = await web3Signer.getAddress();

        const counterContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          web3Signer
        );

        setProvider(web3Provider);
        setSigner(web3Signer);
        setContract(counterContract);
        setAccount(userAddress);
        setManufacturerAddress(userAddress);

        await getCurrentNumber(counterContract);
      } catch (error) {
        console.error("Error connecting wallet:", error);
        alert("Error connecting wallet: " + error.message);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Get current number from contract
  const getCurrentNumber = async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      setLoading(true);
      const number = await contractInstance.number();
      setCurrentNumber(number.toString());
    } catch (error) {
      console.error("Error fetching number:", error);
    } finally {
      setLoading(false);
    }
  };

  // Register manufacturer - UPDATED with both parameters
  const handleManufacturerRegister = async () => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    if (!manufacturerAddress.trim() || !manufacturerName.trim()) {
      alert("Please enter both manufacturer address and name");
      return;
    }

    // Validate address format
    let validAddress;
    try {
      validAddress = ethers.getAddress(manufacturerAddress);
    } catch (error) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    // Check for zero address
    if (validAddress === ethers.ZeroAddress) {
      alert(
        "Cannot use zero address (0x0000000000000000000000000000000000000000)"
      );
      return;
    }

    // Validate name length (3-100 characters as per your Rust code)
    const trimmedName = manufacturerName.trim();
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      alert("Manufacturer name must be between 3 and 100 characters");
      return;
    }

    try {
      setLoading(true);
      setRegistrationStatus("Checking transaction...");

      // First, let's estimate gas to see if there are any issues
      try {
        const gasEstimate = await contract.manufacturerRegisters.estimateGas(
          validAddress,
          trimmedName
        );
        console.log("Gas estimate:", gasEstimate.toString());
      } catch (estimationError) {
        console.error("Gas estimation failed:", estimationError);
        setRegistrationStatus("Error: Transaction will fail");

        // Try to extract revert reason
        if (estimationError.reason) {
          alert(`Transaction will fail: ${estimationError.reason}`);
        } else if (estimationError.message) {
          const errorMsg = estimationError.message.toLowerCase();
          if (errorMsg.includes("already_registered")) {
            alert("This address is already registered as a manufacturer");
          } else if (errorMsg.includes("invalid_manufacturer_name")) {
            alert(
              "Invalid manufacturer name. Name must be between 3-100 characters and unique."
            );
          } else if (errorMsg.includes("name_not_available")) {
            alert("This manufacturer name is already taken");
          } else if (errorMsg.includes("address_zero")) {
            alert("Cannot use zero address");
          } else if (
            errorMsg.includes("unauthorized") ||
            errorMsg.includes("not_owner")
          ) {
            alert("You are not authorized to register manufacturers");
          } else {
            alert(
              "Transaction will fail. Please check the inputs and try again."
            );
          }
        } else {
          alert(
            "Transaction will fail. Please check the inputs and try again."
          );
        }
        setLoading(false);
        return;
      }

      setRegistrationStatus("Sending transaction...");

      // Send transaction with both parameters
      const tx = await contract.manufacturerRegisters(
        validAddress,
        trimmedName,
        {
          gasLimit: 150000, // Slightly higher gas limit for string parameter
        }
      );

      setRegistrationStatus("Transaction sent. Waiting for confirmation...");
      console.log("Transaction hash:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      setRegistrationStatus("Registration successful!");
      setManufacturerAddress("");
      setManufacturerName("");

      alert("Manufacturer registered successfully!");
    } catch (error) {
      console.error("Error registering manufacturer:", error);

      let errorMessage = "Registration failed: ";

      // Handle different error types
      if (error.code === "UNKNOWN_ERROR") {
        errorMessage +=
          "Internal blockchain error. The transaction may have reverted.";
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage += "Insufficient funds for gas.";
      } else if (error.code === "NONCE_EXPIRED") {
        errorMessage += "Transaction nonce expired. Please try again.";
      } else if (error.reason) {
        errorMessage += error.reason;
      } else if (error.message) {
        // Filter out ENS errors and extract meaningful part
        const rawMessage = error.message;
        if (rawMessage.includes("network does not support ENS")) {
          errorMessage += rawMessage
            .replace(/network does not support ENS[^,]*,?/, "")
            .trim();
        } else if (rawMessage.includes("execution reverted")) {
          errorMessage +=
            "Contract execution reverted. Check if address is already registered or name is taken.";
        } else {
          errorMessage += rawMessage;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }

      setRegistrationStatus("Error: Registration failed");
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Counter functions (same as before)
  const handleIncrement = async () => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.increment();
      await tx.wait();
      await getCurrentNumber();
      alert("Number incremented successfully!");
    } catch (error) {
      console.error("Error incrementing number:", error);
      let errorMessage = error.message;
      if (errorMessage.includes("network does not support ENS")) {
        errorMessage = errorMessage
          .replace(/network does not support ENS[^,]*,?/, "")
          .trim();
      }
      alert("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    const numberToAdd = prompt("Enter number to add:");
    if (!numberToAdd) return;

    try {
      setLoading(true);
      const tx = await contract.addNumber(numberToAdd);
      await tx.wait();
      await getCurrentNumber();
      alert("Number added successfully!");
    } catch (error) {
      console.error("Error adding number:", error);
      let errorMessage = error.message;
      if (errorMessage.includes("network does not support ENS")) {
        errorMessage = errorMessage
          .replace(/network does not support ENS[^,]*,?/, "")
          .trim();
      }
      alert("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetNumber = async () => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    const newNumber = prompt("Enter new number:");
    if (!newNumber) return;

    try {
      setLoading(true);
      const tx = await contract.setNumber(newNumber);
      await tx.wait();
      await getCurrentNumber();
      alert("Number set successfully!");
    } catch (error) {
      console.error("Error setting number:", error);
      let errorMessage = error.message;
      if (errorMessage.includes("network does not support ENS")) {
        errorMessage = errorMessage
          .replace(/network does not support ENS[^,]*,?/, "")
          .trim();
      }
      alert("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiplyNumber = async () => {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }

    const multiplier = prompt("Enter multiplier:");
    if (!multiplier) return;

    try {
      setLoading(true);
      const tx = await contract.mulNumber(multiplier);
      await tx.wait();
      await getCurrentNumber();
      alert("Number multiplied successfully!");
    } catch (error) {
      console.error("Error multiplying number:", error);
      let errorMessage = error.message;
      if (errorMessage.includes("network does not support ENS")) {
        errorMessage = errorMessage
          .replace(/network does not support ENS[^,]*,?/, "")
          .trim();
      }
      alert("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then(async (accounts) => {
          if (accounts.length > 0) {
            const web3Provider = createProvider();
            if (web3Provider) {
              const web3Signer = await web3Provider.getSigner();
              const counterContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                web3Signer
              );

              setProvider(web3Provider);
              setSigner(web3Signer);
              setContract(counterContract);
              setAccount(accounts[0]);
              setManufacturerAddress(accounts[0]);
              await getCurrentNumber(counterContract);
            }
          }
        });
    }

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setManufacturerAddress(accounts[0]);
          connectWallet();
        } else {
          setAccount("");
          setManufacturerAddress("");
          setContract(null);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
        }
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h1 className="text-3xl font-bold text-center">
            Manufacturer Counter DApp
          </h1>
          <p className="text-center text-blue-100 mt-2">
            Manage manufacturers and counter operations
          </p>
        </div>

        {/* Connection Status */}
        <div className="p-6 border-b border-gray-200">
          {!account ? (
            <div className="text-center">
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Connect MetaMask Wallet
              </button>
              <p className="text-gray-600 mt-3">
                Please connect your wallet to interact with the contract
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-semibold">
                    Connected:{" "}
                    <span className="font-mono">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                  </p>
                  <p className="text-green-600 text-sm">
                    Arbitrum Sepolia Network
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {account && (
          <div className="p-6">
            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab("counter")}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                  activeTab === "counter"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🎯 Counter Operations
              </button>
              <button
                onClick={() => setActiveTab("manufacturer")}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                  activeTab === "manufacturer"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🏢 Manufacturer Registration
              </button>
            </div>

            {/* Counter Tab */}
            {activeTab === "counter" && (
              <div className="space-y-6">
                {/* Current Number Display */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6 text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Current Number
                  </h2>
                  <div className="text-5xl font-bold text-orange-600 mb-4">
                    {loading ? (
                      <div className="inline-flex items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                      </div>
                    ) : (
                      currentNumber
                    )}
                  </div>
                  <button
                    onClick={getCurrentNumber}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {/* Counter Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={handleIncrement}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <div className="text-xl">➕</div>
                    <div>Increment</div>
                  </button>

                  <button
                    onClick={handleAddNumber}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <div className="text-xl">🔢</div>
                    <div>Add Number</div>
                  </button>

                  <button
                    onClick={handleSetNumber}
                    disabled={loading}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-4 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <div className="text-xl">🎯</div>
                    <div>Set Number</div>
                  </button>

                  <button
                    onClick={handleMultiplyNumber}
                    disabled={loading}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-4 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    <div className="text-xl">✖️</div>
                    <div>Multiply Number</div>
                  </button>
                </div>
              </div>
            )}

            {/* Manufacturer Tab - UPDATED with name field */}
            {activeTab === "manufacturer" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Register Manufacturer
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Register an address with a manufacturer name. Both fields
                    are required.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manufacturer Address
                      </label>
                      <input
                        type="text"
                        value={manufacturerAddress}
                        onChange={(e) => setManufacturerAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono"
                      />
                      <button
                        onClick={() => setManufacturerAddress(account)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        Use my connected address
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manufacturer Name
                      </label>
                      <input
                        type="text"
                        value={manufacturerName}
                        onChange={(e) => setManufacturerName(e.target.value)}
                        placeholder="Enter manufacturer name (3-100 characters)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {manufacturerName.length}/100 characters • Must be
                        unique
                      </p>
                    </div>

                    <button
                      onClick={handleManufacturerRegister}
                      disabled={
                        loading ||
                        !manufacturerAddress.trim() ||
                        !manufacturerName.trim() ||
                        manufacturerName.trim().length < 3 ||
                        manufacturerName.trim().length > 100
                      }
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Registering...
                        </div>
                      ) : (
                        "Register Manufacturer"
                      )}
                    </button>

                    {registrationStatus && (
                      <div
                        className={`p-4 rounded-lg ${
                          registrationStatus.includes("Error")
                            ? "bg-red-50 border border-red-200 text-red-800"
                            : "bg-green-50 border border-green-200 text-green-800"
                        }`}
                      >
                        <p className="font-medium">{registrationStatus}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="text-center text-gray-700 font-medium">
                    Processing transaction...
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-2">
                    Please wait for confirmation
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Counter;
