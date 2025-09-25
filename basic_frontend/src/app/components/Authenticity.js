"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QRCodeCanvas } from "qrcode.react";
import { signTypedData } from "../resources/typedData.js";
import { parseError } from "../resources/error.js";
import { AUTHENTICITY_ABI } from "../resources/authenticity_abi.js";

const AUTHENTICITY = process.env.NEXT_PUBLIC_AUTHENTICITY;

export default function Authenticity() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [rContract, setRContract] = useState(null);
  const [sContract, setSContract] = useState(null);
  const [formVisible, setFormVisible] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [queryAddress, setQueryAddress] = useState("");
  const [signatureResult, setSignatureResult] = useState("");
  const [signature, setSignature] = useState("");
  const [veriSignature, setVeriSignature] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [chainId, setChainId] = useState("");
  const [veriResult, setVeriResult] = useState({});
  const [certificate, setCertificate] = useState({
    name: "iPhone 12",
    uniqueId: "IMEI123",
    serial: "123456",
    date: "",
    owner: "0xF2E7E2f51D7C9eEa9B0313C2eCa12f8e43bd1855",
    metadata: "BLACK, 128GB",
  });


  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      setRContract(
        new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, web3Provider)
      );
    } else {
      setProvider(ethers.getDefaultProvider);
      toast.error("Please install MetaMask!");
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      return toast.error("MetaMask not detected");
    }

    try {
      if (!account) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const signer = await provider.getSigner();

        const network = await provider.getNetwork();
        setChainId(network.chainId);

        const address = await signer.getAddress();
        setSigner(signer);
        setAccount(address);
        setSContract(
          new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, signer)
        );

        console.log("Chain ID", network.chainId);

        toast.success(
          `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
        );

        return;
      }

      //to disconnect wallet
      setSigner(null);
      setAccount(null);
      const network = await provider.getNetwork();
      setChainId(network.chainId);

      setRContract(
        new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, provider)
      ); // to call view function
      toast.success("Wallet disconnected");
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const checkConnection = () => {
    if (!account) {
      toast.error("Connect wallet!");
      return false;
    }
    return true;
  };

  const withRetry = async (fn, args) => {
    let retries = 3;
    while (retries > 0) {
      try {
        const tx = await fn(...args);
        await tx.wait();
        return true;
      } catch (error) {
        retries--;
        if (retries === 0 || !error.message.includes("circuit breaker")) {
          throw error;
        }
        toast.info(`Retrying... (${3 - retries}/3)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  };

  const registerManufacturer = async (e) => {
    e.preventDefault();
    if (!checkConnection() || !sContract) return;
    try {
      if (!manufacturerAddress || !ethers.isAddress(manufacturerAddress)) {
        throw new Error("Valid manufacturer address required");
      }
      if (!manufacturerName || manufacturerName.length < 3) {
        throw new Error("Manufacturer name must be at least 3 characters");
      }
      await withRetry(sContract.manufacturerRegisters, [
        manufacturerAddress,
        manufacturerName,
      ]);
      toast.success(
        `Manufacturer ${manufacturerName} registered at ${manufacturerAddress}`
      );
      setManufacturerAddress("");
      setManufacturerName("");
      setFormVisible("");
    } catch (error) {
      toast.error(`Error: ${parseError(error)}`);
    }
  };

  const setAuthorisedRetailers = async (e) => {
    e.preventDefault();
    if (!checkConnection() || !sContract) return;
    try {
      if (!manufacturerAddress || !ethers.isAddress(manufacturerAddress)) {
        throw new Error("Valid retailer address required");
      }
      const tx = await sContract.setAuthorisedRetailers(manufacturerAddress);
      await tx.wait();
      toast.success(`Retailer ${manufacturerAddress} authorized`);
      setManufacturerAddress("");
      setFormVisible("");
    } catch (error) {
      const parsedError = parseError(error);
      if (parsedError.includes("ADDRESS_ZERO")) {
        toast.error("Error: Retailer address cannot be zero");
      } else if (parsedError.includes("NOT_REGISTERED")) {
        toast.error("Error: Manufacturer not registered");
      } else if (parsedError.includes("UNAUTHORISED")) {
        toast.error("Error: Not authorized to set retailers");
      } else {
        toast.error(`Error: ${parsedError}`);
      }
    }
  };

  const getManufacturer = async (e) => {
    e.preventDefault();
    if (!checkConnection() || !rContract) return;
    try {
      if (!queryAddress || !ethers.isAddress(queryAddress)) {
        throw new Error("Valid address required");
      }
      const name = await rContract.getManufacturer(queryAddress);
      setManufacturerDetails(`Name: ${name}, Address: ${queryAddress}`);
      toast.success(`Found manufacturer: ${name}`);
    } catch (error) {
      const parsedError = parseError(error);
      if (parsedError.includes("DOES_NOT_EXIST")) {
        toast.error("Error: Manufacturer does not exist");
      } else {
        toast.error(`Error: ${parsedError}`);
      }
    }
  };

  const verifySignature = async (e) => {
    e.preventDefault();
    if (!checkConnection() || !rContract || !signer) return;
    try {
      if (
        !certificate.name ||
        !certificate.uniqueId ||
        !certificate.serial ||
        !certificate.metadata
      ) {
        throw new Error("All certificate fields required except date");
      }
      if (!account || !ethers.isAddress(account)) {
        throw new Error("Valid owner address required");
      }

      const metadata = createMetadata(certificate.metadata);
      const date = Math.floor(Date.now() / 1000).toString();

      const cert = {
        name: certificate.name,
        unique_id: certificate.uniqueId,
        serial: certificate.serial,
        date: parseInt(date),
        owner: account,
        metadataHash: ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
        ),
        metadata,
      };

      const { domain, types, value } = signTypedData(cert, chainId);
      const inSign = await signer.signTypedData(domain, types, value);

      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        value,
        inSign
      );
      if (recoveredAddress.toLowerCase() !== cert.owner.toLowerCase()) {
        throw new Error(
          "Frontend verification failed: Signer does not match owner"
        );
      }
      toast.info("Frontend signature verification passed");

      const isValid = await rContract.verifySignature(
        cert.name,
        cert.unique_id,
        cert.serial,
        ethers.toBigInt(cert.date),
        cert.owner,
        cert.metadataHash,
        inSign
      );

      setSignatureResult(`Signature valid: ${isValid}`);
      setSignature(inSign);

      const qrData = JSON.stringify({ cert, signature: inSign });
      setQrCodeData(qrData);

      toast.success(`Signature verification: ${isValid}`);
    } catch (error) {
      const parsedError = parseError(error);
      if (parsedError.includes("INVALID_SIGNATURE")) {
        toast.error("Error: Invalid signature");
      } else if (parsedError.includes("EC_RECOVER_CALL_ERROR")) {
        toast.error("Error: Signature recovery failed");
      } else {
        toast.error(`Error: ${parsedError}`);
      }
    }
  };

  const verifyProductAuthenticity = async (e) => {
    e.preventDefault();
    if (!checkConnection() || !rContract) return;
    try {
      if (
        !certificate.name ||
        !certificate.uniqueId ||
        !certificate.serial ||
        !certificate.date ||
        !certificate.owner ||
        !certificate.metadata ||
        !veriSignature
      ) {
        throw new Error("All certificate fields and signature required");
      }
      if (!ethers.isAddress(certificate.owner)) {
        throw new Error("Valid owner address required");
      }
      if (!ethers.isHexString(veriSignature)) {
        throw new Error("Valid signature (hex string) required");
      }

      const metadata = createMetadata(certificate.metadata);
      const cert = {
        name: certificate.name,
        unique_id: certificate.uniqueId,
        serial: certificate.serial,
        date: parseInt(certificate.date),
        owner: certificate.owner,
        metadataHash: ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
        ),
        metadata,
      };

      const [isValid, manuName] = await rContract.verifyAuthenticity(
        cert.name,
        cert.unique_id,
        cert.serial,
        ethers.toBigInt(cert.date),
        cert.owner,
        cert.metadataHash,
        veriSignature
      );

      if (!isValid) {
        throw new Error("Verification failed");
      }

      setVeriResult({
        name: cert.name,
        uniqueId: cert.unique_id,
        serial: cert.serial,
        date: cert.date.toString(),
        owner: cert.owner,
        metadata: certificate.metadata,
        manufacturer: manuName,
      });

      toast.success(`${cert.name} with ID ${cert.unique_id} is authentic`);
      setFormVisible("");
    } catch (error) {
      const parsedError = parseError(error);
      if (parsedError.includes("INVALID_SIGNATURE")) {
        toast.error("Error: Invalid signature");
      } else if (parsedError.includes("EC_RECOVER_CALL_ERROR")) {
        toast.error("Error: Signature recovery failed");
      } else if (parsedError.includes("DOES_NOT_EXIST")) {
        toast.error("Error: Manufacturer does not exist");
      } else {
        toast.error(`Error: ${parsedError}`);
      }
    }
  };

  function createMetadata(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100">
      <header className="p-4 bg-blue-600 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Authenticity Operations</h1>
          <button
            onClick={connectWallet}
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
          >
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Manufacturer Operations
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  onClick={() =>
                    setFormVisible(formVisible === "register" ? "" : "register")
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {formVisible === "register"
                    ? "Hide"
                    : "Register Manufacturer"}
                </button>
                {formVisible === "register" && (
                  <form
                    onSubmit={registerManufacturer}
                    className="space-y-4 mt-4"
                  >
                    <input
                      type="text"
                      placeholder="Manufacturer Address (0x...)"
                      value={manufacturerAddress}
                      onChange={(e) => setManufacturerAddress(e.target.value)}
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Manufacturer Name"
                      value={manufacturerName}
                      onChange={(e) => setManufacturerName(e.target.value)}
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Submit
                    </button>
                  </form>
                )}
              </div>
              <div>
                <button
                  onClick={() =>
                    setFormVisible(
                      formVisible === "setRetailer" ? "" : "setRetailer"
                    )
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {formVisible === "setRetailer"
                    ? "Hide"
                    : "Set Authorized Retailer"}
                </button>
                {formVisible === "setRetailer" && (
                  <form
                    onSubmit={setAuthorisedRetailers}
                    className="space-y-4 mt-4"
                  >
                    <input
                      type="text"
                      placeholder="Retailer Address (0x...)"
                      value={manufacturerAddress}
                      onChange={(e) => setManufacturerAddress(e.target.value)}
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Submit
                    </button>
                  </form>
                )}
              </div>
              <div>
                <button
                  onClick={() =>
                    setFormVisible(
                      formVisible === "byAddress" ? "" : "byAddress"
                    )
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {formVisible === "byAddress"
                    ? "Hide"
                    : "Get Manufacturer by Address"}
                </button>
                {formVisible === "byAddress" && (
                  <form onSubmit={getManufacturer} className="space-y-4 mt-4">
                    <input
                      type="text"
                      placeholder="Manufacturer Address (0x...)"
                      value={queryAddress}
                      onChange={(e) => setQueryAddress(e.target.value)}
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Submit
                    </button>
                    {manufacturerDetails && (
                      <p className="mt-2 text-gray-700">
                        {manufacturerDetails}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Certificate Operations
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  onClick={() =>
                    setFormVisible(formVisible === "verify" ? "" : "verify")
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {formVisible === "verify" ? "Hide" : "Verify Signature"}
                </button>
                {formVisible === "verify" && (
                  <form onSubmit={verifySignature} className="space-y-4 mt-4">
                    <input
                      type="text"
                      placeholder="Certificate Name"
                      value={certificate.name}
                      onChange={(e) =>
                        setCertificate({ ...certificate, name: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Serial"
                      value={certificate.serial}
                      onChange={(e) =>
                        setCertificate({
                          ...certificate,
                          serial: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Submit
                    </button>
                    {signatureResult && (
                      <p className="mt-2 text-gray-700">{signatureResult}</p>
                    )}
                    {qrCodeData && (
                      <div className="mt-4 flex flex-col items-center">
                        <h3 className="text-lg font-semibold text-blue-800">
                          Certificate QR Code
                        </h3>
                        <QRCodeCanvas value={qrCodeData} size={200} />
                        <p className="mt-2 text-sm text-gray-600">
                          Scan to verify your product authenticity
                        </p>
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
                          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg"
                        >
                          Download QR Code
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <div>
                <button
                  onClick={() =>
                    setFormVisible(
                      formVisible === "verifyAuth" ? "" : "verifyAuth"
                    )
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {formVisible === "verifyAuth"
                    ? "Hide"
                    : "Verify Authenticity"}
                </button>
                {formVisible === "verifyAuth" && (
                  <form
                    onSubmit={verifyProductAuthenticity}
                    className="space-y-4 mt-4"
                  >
                    <input
                      type="text"
                      placeholder="Certificate Name"
                      value={certificate.name}
                      onChange={(e) =>
                        setCertificate({ ...certificate, name: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Serial"
                      value={certificate.serial}
                      onChange={(e) =>
                        setCertificate({
                          ...certificate,
                          serial: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Date (Unix timestamp)"
                      value={certificate.date}
                      onChange={(e) =>
                        setCertificate({ ...certificate, date: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Signature (0x...)"
                      value={veriSignature}
                      onChange={(e) => setVeriSignature(e.target.value)}
                      className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Submit
                    </button>
                    {veriResult.name && (
                      <ul className="mt-2 text-gray-700">
                        <li>
                          <p>Name: {veriResult.name}</p>
                          <p>ID: {veriResult.uniqueId}</p>
                          <p>Serial: {veriResult.serial}</p>
                          <p>Date: {veriResult.date}</p>
                          <p>Owner: {veriResult.owner}</p>
                          <p>Metadata: {veriResult.metadata}</p>
                          <p>Manufacturer: {veriResult.manufacturer}</p>
                        </li>
                      </ul>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
      />
    </div>
  );
}
