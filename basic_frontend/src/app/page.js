// src/app/page.js
// import Authenticity from './components/Authenticity';
// import Ownership from "@/app/components/Ownership";
//
// export default function Home() {
//   return (
//       <div>
//         <Authenticity />
//         <Ownership />
//       </div>
//   );
// }

// "use client";

// import React, { useState } from "react";
// import Authenticity from "./components/Authenticity";

// export default function Home() {
//   const [showAuthenticity, setShowAuthenticity] = useState(true);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100">
//       <header className="p-4 bg-blue-600 text-white shadow-md">
//         <div className="container mx-auto flex justify-center">
//           <button
//             onClick={() => setShowAuthenticity(!showAuthenticity)}
//             className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
//           >
//             {showAuthenticity ? "Hide Authenticity" : "Show Authenticity"}
//           </button>
//         </div>
//       </header>
//       <main className="container mx-auto p-6">
//         {showAuthenticity ? (
//           <Authenticity />
//         ) : (
//           <div className="bg-white p-6 rounded-lg shadow-lg text-center">
//             <h2 className="text-xl font-semibold mb-4 text-blue-800">
//               Welcome to Authenticity App
//             </h2>
//             <p className="text-gray-700">
//               Click the button above to interact with the Authenticity smart
//               contract.
//             </p>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }

"use client";

import Counter from "./components/Counter";
import Authenticity from "./components/Authenticity";

export default function Home() {
  return (
    <div>
      {/* <Counter /> */}
      <Authenticity />
    </div>
  );
}
