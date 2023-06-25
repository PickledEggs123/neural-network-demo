import React from 'react';
// @ts-ignore
import './App.css';
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Plot2dPage from "./2dPlot";
import LanguagePage from "./LanguagePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
        <Plot2dPage/>
    ),
  },
  {
    path: "/plot",
    element: (
        <Plot2dPage/>
    ),
  },
  {
    path: "/language",
    element: (
        <LanguagePage/>
    ),
  },
])

function App() {
  return (
      <RouterProvider router={router}/>
  );
}

export default App;
