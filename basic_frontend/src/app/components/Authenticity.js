// "use client";

// import React, { useState, useEffect } from "react";
// import { ethers } from "ethers";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { QRCodeCanvas } from "qrcode.react";
// import { signTypedData } from "../resources/typedData.js";
// import { parseError } from "../resources/error.js";
// import { AUTHENTICITY_ABI } from "../resources/authenticity_abi.js";

// const AUTHENTICITY = process.env.NEXT_PUBLIC_AUTHENTICITY;

// export default function Authenticity() {
//   const [provider, setProvider] = useState(null);
//   const [signer, setSigner] = useState(null);
//   const [account, setAccount] = useState(null);
//   const [rContract, setRContract] = useState(null);
//   const [sContract, setSContract] = useState(null);
//   const [formVisible, setFormVisible] = useState("");
//   const [manufacturerName, setManufacturerName] = useState("");
//   const [manufacturerAddress, setManufacturerAddress] = useState("");
//   const [queryAddress, setQueryAddress] = useState("");
//   const [signatureResult, setSignatureResult] = useState("");
//   const [signature, setSignature] = useState("");
//   const [veriSignature, setVeriSignature] = useState("");
//   const [qrCodeData, setQrCodeData] = useState("");
//   const [chainId, setChainId] = useState("");
//   const [veriResult, setVeriResult] = useState({});
// const [certificate, setCertificate] = useState({
//   name: "iPhone 12",
//   uniqueId: "IMEI123",
//   serial: "123456",
//   date: "",
//   owner: "0xF2E7E2f51D7C9eEa9B0313C2eCa12f8e43bd1855",
//   metadata: "BLACK, 128GB",
// });

//   useEffect(() => {
//     if (typeof window.ethereum !== "undefined") {
//       const web3Provider = new ethers.BrowserProvider(window.ethereum);
//       setProvider(web3Provider);
//       setRContract(
//         new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, web3Provider)
//       );
//     } else {
//       setProvider(ethers.getDefaultProvider);
//       toast.error("Please install MetaMask!");
//     }
//   }, []);

//   const connectWallet = async () => {
//     if (!provider) {
//       return toast.error("MetaMask not detected");
//     }

//     try {
//       if (!account) {
//         await window.ethereum.request({ method: "eth_requestAccounts" });
//         const signer = await provider.getSigner();

//         const network = await provider.getNetwork();
//         setChainId(network.chainId);

//         const address = await signer.getAddress();
//         setSigner(signer);
//         setAccount(address);
//         setSContract(
//           new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, signer)
//         );

//         console.log("Chain ID", network.chainId);

//         toast.success(
//           `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
//         );

//         return;
//       }

//       //to disconnect wallet
//       setSigner(null);
//       setAccount(null);
//       const network = await provider.getNetwork();
//       setChainId(network.chainId);

//       setRContract(
//         new ethers.Contract(AUTHENTICITY, AUTHENTICITY_ABI, provider)
//       ); // to call view function
//       toast.success("Wallet disconnected");
//     } catch (error) {
//       toast.error(`Error: ${error.message}`);
//     }
//   };

//   const checkConnection = () => {
//     if (!account) {
//       toast.error("Connect wallet!");
//       return false;
//     }
//     return true;
//   };

//   const withRetry = async (fn, args) => {
//     let retries = 3;
//     while (retries > 0) {
//       try {
//         const tx = await fn(...args);
//         await tx.wait();
//         return true;
//       } catch (error) {
//         retries--;
//         if (retries === 0 || !error.message.includes("circuit breaker")) {
//           throw error;
//         }
//         toast.info(`Retrying... (${3 - retries}/3)`);
//         await new Promise((resolve) => setTimeout(resolve, 2000));
//       }
//     }
//   };

//   const registerManufacturer = async (e) => {
//     e.preventDefault();
//     if (!checkConnection() || !sContract) return;
//     try {
//       if (!manufacturerAddress || !ethers.isAddress(manufacturerAddress)) {
//         throw new Error("Valid manufacturer address required");
//       }
//       if (!manufacturerName || manufacturerName.length < 3) {
//         throw new Error("Manufacturer name must be at least 3 characters");
//       }
//       await withRetry(sContract.manufacturerRegisters, [
//         manufacturerAddress,
//         manufacturerName,
//       ]);
//       toast.success(
//         `Manufacturer ${manufacturerName} registered at ${manufacturerAddress}`
//       );
//       setManufacturerAddress("");
//       setManufacturerName("");
//       setFormVisible("");
//     } catch (error) {
//       toast.error(`Error: ${parseError(error)}`);
//     }
//   };

//   const setAuthorisedRetailers = async (e) => {
//     e.preventDefault();
//     if (!checkConnection() || !sContract) return;
//     try {
//       if (!manufacturerAddress || !ethers.isAddress(manufacturerAddress)) {
//         throw new Error("Valid retailer address required");
//       }
//       const tx = await sContract.setAuthorisedRetailers(manufacturerAddress);
//       await tx.wait();
//       toast.success(`Retailer ${manufacturerAddress} authorized`);
//       setManufacturerAddress("");
//       setFormVisible("");
//     } catch (error) {
//       const parsedError = parseError(error);
//       if (parsedError.includes("ADDRESS_ZERO")) {
//         toast.error("Error: Retailer address cannot be zero");
//       } else if (parsedError.includes("NOT_REGISTERED")) {
//         toast.error("Error: Manufacturer not registered");
//       } else if (parsedError.includes("UNAUTHORISED")) {
//         toast.error("Error: Not authorized to set retailers");
//       } else {
//         toast.error(`Error: ${parsedError}`);
//       }
//     }
//   };

//   const getManufacturer = async (e) => {
//     e.preventDefault();
//     if (!checkConnection() || !rContract) return;
//     try {
//       if (!queryAddress || !ethers.isAddress(queryAddress)) {
//         throw new Error("Valid address required");
//       }
//       const name = await rContract.getManufacturer(queryAddress);
//       setManufacturerDetails(`Name: ${name}, Address: ${queryAddress}`);
//       toast.success(`Found manufacturer: ${name}`);
//     } catch (error) {
//       const parsedError = parseError(error);
//       if (parsedError.includes("DOES_NOT_EXIST")) {
//         toast.error("Error: Manufacturer does not exist");
//       } else {
//         toast.error(`Error: ${parsedError}`);
//       }
//     }
//   };

//   const verifySignature = async (e) => {
//     e.preventDefault();
//     if (!checkConnection() || !rContract || !signer) return;
//     try {
//       if (
//         !certificate.name ||
//         !certificate.uniqueId ||
//         !certificate.serial ||
//         !certificate.metadata
//       ) {
//         throw new Error("All certificate fields required except date");
//       }
//       if (!account || !ethers.isAddress(account)) {
//         throw new Error("Valid owner address required");
//       }

//       const metadata = createMetadata(certificate.metadata);
//       const date = Math.floor(Date.now() / 1000).toString();

//       const cert = {
//         name: certificate.name,
//         unique_id: certificate.uniqueId,
//         serial: certificate.serial,
//         date: parseInt(date),
//         owner: account,
//         metadataHash: ethers.keccak256(
//           ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
//         ),
//         metadata,
//       };

//       const { domain, types, value } = signTypedData(cert, chainId);
//       const inSign = await signer.signTypedData(domain, types, value);

//       const recoveredAddress = ethers.verifyTypedData(
//         domain,
//         types,
//         value,
//         inSign
//       );
//       if (recoveredAddress.toLowerCase() !== cert.owner.toLowerCase()) {
//         throw new Error(
//           "Frontend verification failed: Signer does not match owner"
//         );
//       }
//       toast.info("Frontend signature verification passed");

//       const isValid = await rContract.verifySignature(
//         cert.name,
//         cert.unique_id,
//         cert.serial,
//         ethers.toBigInt(cert.date),
//         cert.owner,
//         cert.metadataHash,
//         inSign
//       );

//       setSignatureResult(`Signature valid: ${isValid}`);
//       setSignature(inSign);

//       const qrData = JSON.stringify({ cert, signature: inSign });
//       setQrCodeData(qrData);

//       toast.success(`Signature verification: ${isValid}`);
//     } catch (error) {
//       const parsedError = parseError(error);
//       if (parsedError.includes("INVALID_SIGNATURE")) {
//         toast.error("Error: Invalid signature");
//       } else if (parsedError.includes("EC_RECOVER_CALL_ERROR")) {
//         toast.error("Error: Signature recovery failed");
//       } else {
//         toast.error(`Error: ${parsedError}`);
//       }
//     }
//   };

//   const verifyProductAuthenticity = async (e) => {
//     e.preventDefault();
//     if (!checkConnection() || !rContract) return;
//     try {
//       if (
//         !certificate.name ||
//         !certificate.uniqueId ||
//         !certificate.serial ||
//         !certificate.date ||
//         !certificate.owner ||
//         !certificate.metadata ||
//         !veriSignature
//       ) {
//         throw new Error("All certificate fields and signature required");
//       }
//       if (!ethers.isAddress(certificate.owner)) {
//         throw new Error("Valid owner address required");
//       }
//       if (!ethers.isHexString(veriSignature)) {
//         throw new Error("Valid signature (hex string) required");
//       }

//       const metadata = createMetadata(certificate.metadata);
//       const cert = {
//         name: certificate.name,
//         unique_id: certificate.uniqueId,
//         serial: certificate.serial,
//         date: parseInt(certificate.date),
//         owner: certificate.owner,
//         metadataHash: ethers.keccak256(
//           ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
//         ),
//         metadata,
//       };

//       const [isValid, manuName] = await rContract.verifyAuthenticity(
//         cert.name,
//         cert.unique_id,
//         cert.serial,
//         ethers.toBigInt(cert.date),
//         cert.owner,
//         cert.metadataHash,
//         veriSignature
//       );

//       if (!isValid) {
//         throw new Error("Verification failed");
//       }

//       setVeriResult({
//         name: cert.name,
//         uniqueId: cert.unique_id,
//         serial: cert.serial,
//         date: cert.date.toString(),
//         owner: cert.owner,
//         metadata: certificate.metadata,
//         manufacturer: manuName,
//       });

//       toast.success(`${cert.name} with ID ${cert.unique_id} is authentic`);
//       setFormVisible("");
//     } catch (error) {
//       const parsedError = parseError(error);
//       if (parsedError.includes("INVALID_SIGNATURE")) {
//         toast.error("Error: Invalid signature");
//       } else if (parsedError.includes("EC_RECOVER_CALL_ERROR")) {
//         toast.error("Error: Signature recovery failed");
//       } else if (parsedError.includes("DOES_NOT_EXIST")) {
//         toast.error("Error: Manufacturer does not exist");
//       } else {
//         toast.error(`Error: ${parsedError}`);
//       }
//     }
//   };

//   function createMetadata(value) {
//     return value
//       .split(",")
//       .map((item) => item.trim())
//       .filter(Boolean);
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100">
//       <header className="p-4 bg-blue-600 text-white shadow-md">
//         <div className="container mx-auto flex justify-between items-center">
//           <h1 className="text-2xl font-bold">Authenticity Operations</h1>
//           <button
//             onClick={connectWallet}
//             className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//           >
//             {account
//               ? `${account.slice(0, 6)}...${account.slice(-4)}`
//               : "Connect Wallet"}
//           </button>
//         </div>
//       </header>

//       <main className="container mx-auto p-6 space-y-8">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="bg-white p-6 rounded-lg shadow-lg">
//             <h2 className="text-xl font-semibold mb-4 text-blue-800">
//               Manufacturer Operations
//             </h2>
//             <div className="space-y-4">
//               <div>
//                 <button
//                   onClick={() =>
//                     setFormVisible(formVisible === "register" ? "" : "register")
//                   }
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                 >
//                   {formVisible === "register"
//                     ? "Hide"
//                     : "Register Manufacturer"}
//                 </button>
//                 {formVisible === "register" && (
//                   <form
//                     onSubmit={registerManufacturer}
//                     className="space-y-4 mt-4"
//                   >
//                     <input
//                       type="text"
//                       placeholder="Manufacturer Address (0x...)"
//                       value={manufacturerAddress}
//                       onChange={(e) => setManufacturerAddress(e.target.value)}
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <input
//                       type="text"
//                       placeholder="Manufacturer Name"
//                       value={manufacturerName}
//                       onChange={(e) => setManufacturerName(e.target.value)}
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                       type="submit"
//                       className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                     >
//                       Submit
//                     </button>
//                   </form>
//                 )}
//               </div>
//               <div>
//                 <button
//                   onClick={() =>
//                     setFormVisible(
//                       formVisible === "setRetailer" ? "" : "setRetailer"
//                     )
//                   }
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                 >
//                   {formVisible === "setRetailer"
//                     ? "Hide"
//                     : "Set Authorized Retailer"}
//                 </button>
//                 {formVisible === "setRetailer" && (
//                   <form
//                     onSubmit={setAuthorisedRetailers}
//                     className="space-y-4 mt-4"
//                   >
//                     <input
//                       type="text"
//                       placeholder="Retailer Address (0x...)"
//                       value={manufacturerAddress}
//                       onChange={(e) => setManufacturerAddress(e.target.value)}
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                       type="submit"
//                       className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                     >
//                       Submit
//                     </button>
//                   </form>
//                 )}
//               </div>
//               <div>
//                 <button
//                   onClick={() =>
//                     setFormVisible(
//                       formVisible === "byAddress" ? "" : "byAddress"
//                     )
//                   }
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                 >
//                   {formVisible === "byAddress"
//                     ? "Hide"
//                     : "Get Manufacturer by Address"}
//                 </button>
//                 {formVisible === "byAddress" && (
//                   <form onSubmit={getManufacturer} className="space-y-4 mt-4">
//                     <input
//                       type="text"
//                       placeholder="Manufacturer Address (0x...)"
//                       value={queryAddress}
//                       onChange={(e) => setQueryAddress(e.target.value)}
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                       type="submit"
//                       className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                     >
//                       Submit
//                     </button>
//                     {manufacturerDetails && (
//                       <p className="mt-2 text-gray-700">
//                         {manufacturerDetails}
//                       </p>
//                     )}
//                   </form>
//                 )}
//               </div>
//             </div>
//           </div>

//           <div className="bg-white p-6 rounded-lg shadow-lg">
//             <h2 className="text-xl font-semibold mb-4 text-blue-800">
//               Certificate Operations
//             </h2>
//             <div className="space-y-4">
//               <div>
//                 <button
//                   onClick={() =>
//                     setFormVisible(formVisible === "verify" ? "" : "verify")
//                   }
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                 >
//                   {formVisible === "verify" ? "Hide" : "Verify Signature"}
//                 </button>
//                 {formVisible === "verify" && (
//                   <form onSubmit={verifySignature} className="space-y-4 mt-4">
//                     <input
//                       type="text"
//                       placeholder="Certificate Name"
//                       value={certificate.name}
//                       onChange={(e) =>
//                         setCertificate({ ...certificate, name: e.target.value })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Unique ID"
//                       value={certificate.uniqueId}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           uniqueId: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Serial"
//                       value={certificate.serial}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           serial: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Metadata (comma-separated)"
//                       value={certificate.metadata}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           metadata: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <button
//                       type="submit"
//                       className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                     >
//                       Submit
//                     </button>
//                     {signatureResult && (
//                       <p className="mt-2 text-gray-700">{signatureResult}</p>
//                     )}
//                     {qrCodeData && (
//                       <div className="mt-4 flex flex-col items-center">
//                         <h3 className="text-lg font-semibold text-blue-800">
//                           Certificate QR Code
//                         </h3>
//                         <QRCodeCanvas value={qrCodeData} size={200} />
//                         <p className="mt-2 text-sm text-gray-600">
//                           Scan to verify your product authenticity
//                         </p>
//                         <button
//                           onClick={() => {
//                             const canvas = document.querySelector("canvas");
//                             if (canvas) {
//                               const link = document.createElement("a");
//                               link.href = canvas.toDataURL("image/png");
//                               link.download = "certificate-qr.png";
//                               link.click();
//                             }
//                           }}
//                           className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg"
//                         >
//                           Download QR Code
//                         </button>
//                       </div>
//                     )}
//                   </form>
//                 )}
//               </div>

//               <div>
//                 <button
//                   onClick={() =>
//                     setFormVisible(
//                       formVisible === "verifyAuth" ? "" : "verifyAuth"
//                     )
//                   }
//                   className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                 >
//                   {formVisible === "verifyAuth"
//                     ? "Hide"
//                     : "Verify Authenticity"}
//                 </button>
//                 {formVisible === "verifyAuth" && (
//                   <form
//                     onSubmit={verifyProductAuthenticity}
//                     className="space-y-4 mt-4"
//                   >
//                     <input
//                       type="text"
//                       placeholder="Certificate Name"
//                       value={certificate.name}
//                       onChange={(e) =>
//                         setCertificate({ ...certificate, name: e.target.value })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Unique ID"
//                       value={certificate.uniqueId}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           uniqueId: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Serial"
//                       value={certificate.serial}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           serial: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="number"
//                       placeholder="Date (Unix timestamp)"
//                       value={certificate.date}
//                       onChange={(e) =>
//                         setCertificate({ ...certificate, date: e.target.value })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Owner Address (0x...)"
//                       value={certificate.owner}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           owner: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Metadata (comma-separated)"
//                       value={certificate.metadata}
//                       onChange={(e) =>
//                         setCertificate({
//                           ...certificate,
//                           metadata: e.target.value,
//                         })
//                       }
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <input
//                       type="text"
//                       placeholder="Signature (0x...)"
//                       value={veriSignature}
//                       onChange={(e) => setVeriSignature(e.target.value)}
//                       className="w-full p-2 border rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       required
//                     />
//                     <button
//                       type="submit"
//                       className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
//                     >
//                       Submit
//                     </button>
//                     {veriResult.name && (
//                       <ul className="mt-2 text-gray-700">
//                         <li>
//                           <p>Name: {veriResult.name}</p>
//                           <p>ID: {veriResult.uniqueId}</p>
//                           <p>Serial: {veriResult.serial}</p>
//                           <p>Date: {veriResult.date}</p>
//                           <p>Owner: {veriResult.owner}</p>
//                           <p>Metadata: {veriResult.metadata}</p>
//                           <p>Manufacturer: {veriResult.manufacturer}</p>
//                         </li>
//                       </ul>
//                     )}
//                   </form>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>
//       <ToastContainer
//         position="top-right"
//         autoClose={5000}
//         hideProgressBar={false}
//       />
//     </div>
//   );
// }

"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QRCodeCanvas } from "qrcode.react";
import { signTypedData } from "../resources/typedData.js";
import { parseError } from "../resources/error.js";
// import { AUTHENTICITY_ABI } from "../resources/authenticity_abi.js";

// Contract ABI
const AUTHENTICITY_ABI = [
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
    inputs: [
      {
        internalType: "address",
        name: "_address",
        type: "address",
      },
    ],
    name: "getManufacturer",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "unique_id",
        type: "string",
      },
      {
        internalType: "string",
        name: "serial",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "date",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "metadata_hash",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "verifySignature",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "unique_id",
        type: "string",
      },
      {
        internalType: "string",
        name: "serial",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "date",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "metadata_hash",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "verifyAuthenticity",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// const AUTHENTICITY_ADDRESS = process.env.NEXT_PUBLIC_AUTHENTICITY;
const AUTHENTICITY_ADDRESS = "0xfbb18f0732eb2459b08e03f7d1d85c89f0776426";

// Typed data structure for EIP-712 signing
// const signTypedData = (cert, chainId) => {
//   const domain = {
//     name: "ProductAuthenticity",
//     version: "1",
//     chainId: chainId,
//     verifyingContract: AUTHENTICITY_ADDRESS,
//   };

//   const types = {
//     Certificate: [
//       { name: "name", type: "string" },
//       { name: "unique_id", type: "string" },
//       { name: "serial", type: "string" },
//       { name: "date", type: "uint256" },
//       { name: "owner", type: "address" },
//       { name: "metadata_hash", type: "bytes32" },
//     ],
//   };

//   const value = {
//     name: cert.name,
//     unique_id: cert.unique_id,
//     serial: cert.serial,
//     date: cert.date,
//     owner: cert.owner,
//     metadata_hash: cert.metadataHash,
//   };

//   return { domain, types, value };
// };

// Error parsing function
// const parseError = (error) => {
//   if (error.reason) return error.reason;
//   if (error.message) {
//     const message = error.message.toLowerCase();
//     if (message.includes("already_registered"))
//       return "Address already registered";
//     if (message.includes("invalid_manufacturer_name"))
//       return "Invalid manufacturer name";
//     if (message.includes("name_not_available")) return "Name not available";
//     if (message.includes("address_zero")) return "Zero address not allowed";
//     if (message.includes("not_registered"))
//       return "Manufacturer not registered";
//     if (message.includes("invalid_signature")) return "Invalid signature";
//     if (message.includes("ec_recover_call_error"))
//       return "Signature recovery failed";
//     if (message.includes("does_not_exist"))
//       return "Manufacturer does not exist";
//     if (message.includes("unauthorized")) return "Not authorized";
//     return error.message;
//   }
//   return "Unknown error occurred";
// };

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

  // const [certificate, setCertificate] = useState({
  //   name: "",
  //   uniqueId: "",
  //   serial: "",
  //   date: "",
  //   owner: "",
  //   metadata: "",
  // });

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

  // Verify signature
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

      const cert = {
        name: certificate.name,
        unique_id: certificate.uniqueId,
        serial: certificate.serial,
        date: date,
        owner: owner,
        metadataHash: ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
        ),
      };

      const { domain, types, value } = signTypedData(
        cert,
        (await provider.getNetwork()).chainId
      );
      const signature = await signer.signTypedData(domain, types, value);

      // Verify signature locally first
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        value,
        signature
      );
      if (recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("Frontend signature verification failed");
      }

      toast.info("Frontend signature verification passed");

      // Verify on contract
      const isValid = await contract.verifySignature(
        cert.name,
        cert.unique_id,
        cert.serial,
        BigInt(cert.date),
        cert.owner,
        cert.metadataHash,
        signature
      );

      setSignatureResult(`Signature valid: ${isValid}`);
      setSignature(signature);

      // Generate QR code data
      const qrData = JSON.stringify({
        cert: {
          ...cert,
          metadata: certificate.metadata,
        },
        signature: signature,
      });
      setQrCodeData(qrData);

      toast.success(`Signature verification: ${isValid}`);
    } catch (error) {
      console.error("Error verifying signature:", error);
      const errorMsg = parseError(error);
      toast.error(`Verification failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify product authenticity
  const handleVerifyAuthenticity = async () => {
    if (!contract) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (
      !certificate.name ||
      !certificate.uniqueId ||
      !certificate.serial ||
      !certificate.date ||
      !certificate.owner ||
      !certificate.metadata ||
      !veriSignature
    ) {
      toast.error("All fields are required");
      return;
    }

    // Validate address
    try {
      ethers.getAddress(certificate.owner);
    } catch (error) {
      toast.error("Please enter a valid owner address");
      return;
    }

    // Validate signature format
    if (!ethers.isHexString(veriSignature)) {
      toast.error("Please enter a valid hex signature");
      return;
    }

    try {
      setLoading(true);

      const metadata = certificate.metadata
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const cert = {
        name: certificate.name,
        unique_id: certificate.uniqueId,
        serial: certificate.serial,
        date: parseInt(certificate.date),
        owner: certificate.owner,
        metadataHash: ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(["string[]"], [metadata])
        ),
      };

      const [isValid, manufacturerName] = await contract.verifyAuthenticity(
        cert.name,
        cert.unique_id,
        cert.serial,
        BigInt(cert.date),
        cert.owner,
        cert.metadataHash,
        veriSignature
      );

      if (isValid) {
        setVeriResult({
          name: cert.name,
          uniqueId: cert.unique_id,
          serial: cert.serial,
          date: new Date(cert.date * 1000).toLocaleDateString(),
          owner: cert.owner,
          metadata: certificate.metadata,
          manufacturer: manufacturerName,
        });
        toast.success(
          `✅ ${cert.name} is authentic! Manufacturer: ${manufacturerName}`
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
                      <input
                        type="text"
                        placeholder="Signature (0x...)"
                        value={veriSignature}
                        onChange={(e) => setVeriSignature(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 font-mono"
                      />
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
