import React from "react";
import {redirect, RedirectType} from "next/navigation";
import {RootLayout} from "@/app/components/RootLayout";

export default function RedirectPage() {
    redirect("/about", RedirectType.replace);
    return (
        <RootLayout>
            <div>
            </div>
        </RootLayout>
    );
};
