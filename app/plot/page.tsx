import React from "react";
import {RootLayout} from "../components/RootLayout";
import SubPage from "@/app/plot/SubPage";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Tyler Truong ML Demo - 2d Plotting",
    description: "What I learned about trying to plot 2d data and classifying points as red or blue at my time in UCF.",
};

function Plot2dPage() {
  return (
      <RootLayout>
        <SubPage/>
      </RootLayout>
  );
}

export default Plot2dPage;
