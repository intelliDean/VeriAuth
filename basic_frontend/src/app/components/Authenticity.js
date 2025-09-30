"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QRCodeCanvas } from "qrcode.react";
import { parseError } from "../resources/error.js";
import { AUTHENTICITY_ABI } from "../resources/authenticity_abi.js";


const AUTHENTICITY_ADDRESS = process.env.NEXT_PUBLIC_AUTHENTICITY;


export default function Authenticity() {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState("manufacturer");
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [queryAddress, setQueryAddress] = useState("");
  const [manufacturerDetails, setManufacturerDetails] = useState("");
  const [signatureResult, setSignatureResult] = useState("");
  const [signature, setSignature] = useState("");
  const [veriSignature, setVeriSignature] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [veriResult, setVeriResult] = useState({});

  const [certificate, setCertificate] = useState({
    name: "iPhone 12",
    uniqueId: "IMEI123",
    serial: "123456",
    date: "",
    owner: "0xF2E7E2f51D7C9eEa9B0313C2eCa12f8e43bd1855",
    metadata: "BLACK, 128GB",
  });

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

        const authenticityContract = new ethers.Contract(
          AUTHENTICITY_ADDRESS,
          AUTHENTICITY_ABI,
          web3Signer
        );

        setProvider(web3Provider);
        setSigner(web3Signer);
        setContract(authenticityContract);
        setAccount(userAddress);
        setManufacturerAddress(userAddress);

        toast.success(
          `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
        );
      } catch (error) {
        console.error("Error connecting wallet:", error);
        toast.error("Error connecting wallet: " + error.message);
      }
    } else {
      toast.error("Please install MetaMask!");
    }
  };

  // Register manufacturer with enhanced error handling
  const handleManufacturerRegister = async () => {
    if (!contract) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!manufacturerAddress.trim() || !manufacturerName.trim()) {
      toast.error("Please enter both manufacturer address and name");
      return;
    }

    // Validate address format
    let validAddress;
    try {
      validAddress = ethers.getAddress(manufacturerAddress);
    } catch (error) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    // Check for zero address
    if (validAddress === ethers.ZeroAddress) {
      toast.error("Cannot use zero address");
      return;
    }

    // Validate name length
    const trimmedName = manufacturerName.trim();
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      toast.error("Manufacturer name must be between 3 and 100 characters");
      return;
    }

    try {
      setLoading(true);

      // Gas estimation
      try {
        const gasEstimate = await contract.manufacturerRegisters.estimateGas(
          validAddress,
          trimmedName
        );
        console.log("Gas estimate:", gasEstimate.toString());
      } catch (estimationError) {
        console.error("Gas estimation failed:", estimationError);
        const errorMsg = parseError(estimationError);
        toast.error(`Transaction will fail: ${errorMsg}`);
        setLoading(false);
        return;
      }

      // Send transaction
      const tx = await contract.manufacturerRegisters(
        validAddress,
        trimmedName,
        {
          gasLimit: 200000,
        }
      );

      await tx.wait();

      toast.success(`Manufacturer ${trimmedName} registered successfully!`);
      setManufacturerAddress("");
      setManufacturerName("");
    } catch (error) {
      console.error("Error registering manufacturer:", error);
      const errorMsg = parseError(error);
      toast.error(`Registration failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Get manufacturer details
  const handleGetManufacturer = async () => {
    if (!contract) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!queryAddress.trim()) {
      toast.error("Please enter a manufacturer address");
      return;
    }

    // Validate address format
    let validAddress;
    try {
      validAddress = ethers.getAddress(queryAddress);
    } catch (error) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    try {
      setLoading(true);
      const name = await contract.getManufacturer(validAddress);
      setManufacturerDetails(`Name: ${name}, Address: ${validAddress}`);
      toast.success(`Found manufacturer: ${name}`);
    } catch (error) {
      console.error("Error fetching manufacturer:", error);
      const errorMsg = parseError(error);
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify signature - UPDATED to match Stylus contract method
  const handleVerifySignature = async () => {
    if (!contract || !signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      !certificate.name ||
      !certificate.uniqueId ||
      !certificate.serial ||
      !certificate.metadata
    ) {
      toast.error("All certificate fields are required");
      return;
    }

    try {
      setLoading(true);

      const metadata = certificate.metadata
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const date = Math.floor(Date.now() / 1000);
      const owner = account;

      // Calculate metadata hash the same way as contract
      const metadataHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
      );

      // Create message data exactly like the Stylus contract
      const messageData = ethers.concat([
        ethers.toUtf8Bytes(certificate.name),
        ethers.toUtf8Bytes(certificate.uniqueId),
        ethers.toUtf8Bytes(certificate.serial),
        ethers.zeroPadValue(ethers.toBeHex(date), 32), // U256 in big-endian bytes
        ethers.getBytes(owner),
        ethers.getBytes(metadataHash),
      ]);

      // Hash the message data
      const messageHash = ethers.keccak256(messageData);

      // Add Ethereum signed message prefix (matches Stylus contract)
      const ethSignedMessageHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
          ethers.getBytes(messageHash),
        ])
      );

      // Sign the hash using personal_sign (not signTypedData)
      const signature = await signer.signMessage(ethers.getBytes(messageHash));
      console.log("signature: ", signature);

      // Verify signature locally first
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signature
      );
      if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("Frontend signature verification failed");
      } else {
        console.log(
          "Frontend verification: ",
          recoveredAddress.toLowerCase() === owner.toLowerCase()
        );
      }

      toast.info("Frontend signature verification passed");

      // Verify on contract
      const isValid = await contract.verifySignature(
        certificate.name,
        certificate.uniqueId,
        certificate.serial,
        BigInt(date),
        owner,
        metadataHash,
        signature
      );

      console.log("Smart contract verification: ", isValid);

      setSignatureResult(`Signature valid: ${isValid}`);
      setSignature(signature);

      // Generate QR code data
      const qrData = JSON.stringify({
        name: certificate.name,
        uniqueId: certificate.uniqueId,
        serial: certificate.serial,
        date: date,
        owner: owner,
        metadata: certificate.metadata,
        metadataHash: metadataHash,
        signature: signature,
      });
      setQrCodeData(qrData);

      if (isValid) {
        toast.success("✅ Signature verification passed on contract!");
      } else {
        toast.error("❌ Signature verification failed on contract");
      }
    } catch (error) {
      console.error("Error verifying signature:", error);
      const errorMsg = parseError(error);
      toast.error(`Verification failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify product authenticity - UPDATED
  const handleVerifyAuthenticity = async () => {
    if (!contract) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);

      let name,
        uniqueId,
        serial,
        date,
        owner,
        metadata,
        metadataHash,
        signature;

      // Check if we have QR code data to parse
      if (qrCodeData && !certificate.name) {
        try {
          const qrData = JSON.parse(qrCodeData);
          name = qrData.name || qrData.cert?.name;
          uniqueId = qrData.uniqueId || qrData.cert?.uniqueId;
          serial = qrData.serial || qrData.cert?.serial;
          date = qrData.date || qrData.cert?.date;
          owner = qrData.owner || qrData.cert?.owner;
          metadata = qrData.metadata || qrData.cert?.metadata;
          metadataHash = qrData.metadataHash || qrData.cert?.metadataHash;
          signature = qrData.signature;

          // Auto-fill the form
          setCertificate({
            name: name || "",
            uniqueId: uniqueId || "",
            serial: serial || "",
            date: date?.toString() || "",
            owner: owner || "",
            metadata: metadata || "",
          });
          setVeriSignature(signature || "");
        } catch (error) {
          console.error("Error parsing QR data:", error);
        }
      }

      // Use form data if QR data is not available or incomplete
      if (
        !name ||
        !uniqueId ||
        !serial ||
        !date ||
        !owner ||
        !metadataHash ||
        !signature
      ) {
        if (
          !certificate.name ||
          !certificate.uniqueId ||
          !certificate.serial ||
          !certificate.date ||
          !certificate.owner ||
          !certificate.metadata ||
          !veriSignature
        ) {
          throw new Error("All fields are required");
        }

        name = certificate.name;
        uniqueId = certificate.uniqueId;
        serial = certificate.serial;
        date = parseInt(certificate.date);
        owner = certificate.owner;
        signature = veriSignature;

        // Calculate metadata hash
        const metadataArray = certificate.metadata
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        console.log("metadata Array: ", metadataArray);
        metadataHash = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["string[]"],
            [metadataArray]
          )
        );

        console.log("metadataHash: ", metadataHash);
      }

      // Validate address
      try {
        ethers.getAddress(owner);
      } catch (error) {
        throw new Error("Please enter a valid owner address");
      }

      // Validate signature format
      if (!ethers.isHexString(signature)) {
        throw new Error("Please enter a valid hex signature");
      }

      console.log("About to verify from on smart contract: ");
      console.log("name: ", name);
      console.log("unique id: ", uniqueId);
      console.log("serial: ", serial);
      console.log("date: ", BigInt(date));
      console.log("owner: ", owner);
      console.log("metadataHash: ", metadataHash);
      console.log("signature: ", signature);

      const isValid = await contract.verifySignature(
        name,
        uniqueId,
        serial,
        BigInt(date),
        owner,
        metadataHash,
        signature
      );


      console.log("result: ", isValid);

      if (isValid) {
        setVeriResult({
          name: name,
          uniqueId: uniqueId,
          serial: serial,
          date: new Date(date * 1000).toLocaleDateString(),
          owner: owner,
          metadata: metadata || certificate.metadata,
          manufacturer: manufacturerName,
        });
        toast.success(
          `✅ ${name} is authentic! Manufacturer: ${manufacturerName}`
        );
      } else {
        toast.error("❌ Product authenticity verification failed");
      }
    } catch (error) {
      console.error("Error verifying authenticity:", error);
      const errorMsg = parseError(error);
      toast.error(`Verification failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle QR code scanning
  const handleQRScan = (qrData) => {
    try {
      const data = JSON.parse(qrData);
      setCertificate({
        name: data.name || data.cert?.name || "",
        uniqueId: data.uniqueId || data.cert?.uniqueId || "",
        serial: data.serial || data.cert?.serial || "",
        date: data.date?.toString() || data.cert?.date?.toString() || "",
        owner: data.owner || data.cert?.owner || "",
        metadata: data.metadata || data.cert?.metadata || "",
      });
      setVeriSignature(data.signature || "");
      setActiveTab("verify");
      toast.success("QR code data loaded successfully!");
    } catch (error) {
      toast.error("Invalid QR code data");
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
              const authenticityContract = new ethers.Contract(
                AUTHENTICITY_ADDRESS,
                AUTHENTICITY_ABI,
                web3Signer
              );

              setProvider(web3Provider);
              setSigner(web3Signer);
              setContract(authenticityContract);
              setAccount(accounts[0]);
              setManufacturerAddress(accounts[0]);
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
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <h1 className="text-3xl font-bold text-center">
            Product Authenticity DApp
          </h1>
          <p className="text-center text-blue-100 mt-2">
            Verify product authenticity and manage manufacturers
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
                onClick={() => setActiveTab("manufacturer")}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                  activeTab === "manufacturer"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🏢 Manufacturer Operations
              </button>
              <button
                onClick={() => setActiveTab("certificate")}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                  activeTab === "certificate"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📜 Certificate Operations
              </button>
              <button
                onClick={() => setActiveTab("verify")}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-md transition-all duration-200 ${
                  activeTab === "verify"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🔍 Verify Authenticity
              </button>
            </div>

            {/* Manufacturer Tab */}
            {activeTab === "manufacturer" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Register Manufacturer */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Register Manufacturer
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Manufacturer Address
                        </label>
                        <input
                          type="text"
                          value={manufacturerAddress}
                          onChange={(e) =>
                            setManufacturerAddress(e.target.value)
                          }
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
                          {manufacturerName.length}/100 characters
                        </p>
                      </div>
                      <button
                        onClick={handleManufacturerRegister}
                        disabled={
                          loading ||
                          !manufacturerAddress.trim() ||
                          !manufacturerName.trim() ||
                          manufacturerName.trim().length < 3
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
                    </div>
                  </div>

                  {/* Get Manufacturer */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      Get Manufacturer
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Manufacturer Address
                        </label>
                        <input
                          type="text"
                          value={queryAddress}
                          onChange={(e) => setQueryAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleGetManufacturer}
                        disabled={loading || !queryAddress.trim()}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Searching...
                          </div>
                        ) : (
                          "Get Manufacturer"
                        )}
                      </button>
                      {manufacturerDetails && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-medium">
                            {manufacturerDetails}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Tab */}
            {activeTab === "certificate" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Create & Verify Certificate
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Certificate Details
                      </h3>

                      {/* Product Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., iPhone 15 Pro"
                          value={certificate.name}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Unique ID - ADDED THIS MISSING FIELD */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unique ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., IMEI123456789"
                          value={certificate.uniqueId}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              uniqueId: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Serial Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Serial Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., SN123456789"
                          value={certificate.serial}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              serial: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Metadata */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Metadata
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Black, 256GB, 5G"
                          value={certificate.metadata}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              metadata: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Enter comma-separated attributes
                        </p>
                      </div>

                      <button
                        onClick={handleVerifySignature}
                        disabled={
                          loading ||
                          !certificate.name ||
                          !certificate.uniqueId ||
                          !certificate.serial ||
                          !certificate.metadata
                        }
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Signing...
                          </div>
                        ) : (
                          "Create & Sign Certificate"
                        )}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Results
                      </h3>
                      {signatureResult && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 font-medium">
                            {signatureResult}
                          </p>
                        </div>
                      )}
                      {signature && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600 break-all">
                            Signature: {signature}
                          </p>
                        </div>
                      )}
                      {qrCodeData && (
                        <div className="flex flex-col items-center">
                          <h4 className="text-md font-semibold text-gray-700 mb-2">
                            QR Code
                          </h4>
                          <QRCodeCanvas value={qrCodeData} size={150} />
                          <button
                            onClick={() => {
                              const canvas = document.querySelector("canvas");
                              if (canvas) {
                                const link = document.createElement("a");
                                link.href = canvas.toDataURL("image/png");
                                link.download = "certificate-qr.png";
                                link.click();
                              }
                            }}
                            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg text-sm"
                          >
                            Download QR
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Verify Tab */}
            {activeTab === "verify" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Verify Product Authenticity
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Certificate Details
                      </h3>

                      {/* QR Code Data Input - ADD THIS SECTION */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Or paste QR code data
                        </label>
                        <textarea
                          placeholder="Paste QR code JSON data here..."
                          onChange={(e) => setQrCodeData(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white font-mono text-sm"
                          rows={3}
                        />
                        <button
                          onClick={() => handleQRScan(qrCodeData)}
                          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
                        >
                          Load from QR Data
                        </button>
                      </div>

                      {/* Product Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Name
                        </label>
                        <input
                          type="text"
                          placeholder="Product Name"
                          value={certificate.name}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Unique ID */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unique ID
                        </label>
                        <input
                          type="text"
                          placeholder="Unique ID"
                          value={certificate.uniqueId}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              uniqueId: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Serial Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Serial Number
                        </label>
                        <input
                          type="text"
                          placeholder="Serial Number"
                          value={certificate.serial}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              serial: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date (Unix timestamp)
                        </label>
                        <input
                          type="number"
                          placeholder="Date (Unix timestamp)"
                          value={certificate.date}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              date: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Owner Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Owner Address
                        </label>
                        <input
                          type="text"
                          placeholder="Owner Address (0x...)"
                          value={certificate.owner}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              owner: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white font-mono"
                        />
                      </div>

                      {/* Metadata */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Metadata
                        </label>
                        <input
                          type="text"
                          placeholder="Metadata (comma-separated)"
                          value={certificate.metadata}
                          onChange={(e) =>
                            setCertificate({
                              ...certificate,
                              metadata: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white"
                        />
                      </div>

                      {/* Signature */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Signature
                        </label>
                        <input
                          type="text"
                          placeholder="Signature (0x...)"
                          value={veriSignature}
                          onChange={(e) => setVeriSignature(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white font-mono"
                        />
                      </div>

                      <button
                        onClick={handleVerifyAuthenticity}
                        disabled={
                          loading ||
                          !certificate.name ||
                          !certificate.uniqueId ||
                          !certificate.serial ||
                          !certificate.date ||
                          !certificate.owner ||
                          !certificate.metadata ||
                          !veriSignature
                        }
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Verifying...
                          </div>
                        ) : (
                          "Verify Authenticity"
                        )}
                      </button>
                    </div>

                    {/* Results section remains the same */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Verification Result
                      </h3>
                      {veriResult.name && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="text-lg font-semibold text-green-800 mb-2">
                            ✅ Authentic Product
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p>
                              <strong>Product:</strong> {veriResult.name}
                            </p>
                            <p>
                              <strong>Unique ID:</strong> {veriResult.uniqueId}
                            </p>
                            <p>
                              <strong>Serial:</strong> {veriResult.serial}
                            </p>
                            <p>
                              <strong>Date:</strong> {veriResult.date}
                            </p>
                            <p>
                              <strong>Owner:</strong>{" "}
                              <span className="font-mono">
                                {veriResult.owner}
                              </span>
                            </p>
                            <p>
                              <strong>Metadata:</strong> {veriResult.metadata}
                            </p>
                            <p>
                              <strong>Manufacturer:</strong>{" "}
                              {veriResult.manufacturer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
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
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
      />
    </div>
  );
}
