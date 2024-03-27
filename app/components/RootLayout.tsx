import React from "react";
import ClientRootLayout from "@/app/components/ClientRootLayout";

export const RootLayout = ({children}: React.PropsWithChildren) => {
    return (
        <div className="text-center max-w-screen-lg space-y-4 mx-auto my-0">
            <h1>Tyler Truong Neural Network Demo</h1>
            <ClientRootLayout/>
            {children}
        </div>
    );
};
