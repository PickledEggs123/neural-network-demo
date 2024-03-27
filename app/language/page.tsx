import React from "react";
import {RootLayout} from "../components/RootLayout";
import SubPage from "@/app/language/SubPage";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Tyler Truong ML Demo - Language Detection",
    description: "What I learned about trying to classify data such as statistics but in this case, languages into classifications. This is during my time at UCF.",
};

function Page() {
  return (
      <RootLayout>
          <SubPage/>
      </RootLayout>
  );
}

export default Page;
