
import Hero from "./components/hero";

import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";
import Layout from "./components/layout";
import GenerateRequest from "./components/GenerateRequest";
import FullFillRequests from "./components/FullFillRequests";
import SwapDashboard from "./components/SwapDashboard";

const App = () => {
 



  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Hero />} />
        <Route path="generate-requests" element={<GenerateRequest/>}/>
        <Route path="view-requests" element={<FullFillRequests/>}/>
        <Route path="dashboard" element={<SwapDashboard/>}/>
        
   
      </Route>
    </Routes>
  );
};

export default App;