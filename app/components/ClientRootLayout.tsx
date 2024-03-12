"use client";

import React from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function ClientRootLayout() {
    const pathname = usePathname();

    return (
        <div>
            <Link href={"/"}><button style={{color: "white", background: pathname === "/about" ? "blue" : "black"}}>About</button></Link>&nbsp;*&nbsp;
            <Link href={"/plot"}><button style={{color: "white", background: pathname === "/plot" ? "blue" : "black"}}>Plot</button></Link>&nbsp;*&nbsp;
            <Link href={"/language"}><button style={{color: "white", background: pathname === "/language" ? "blue" : "black"}}>Language</button></Link>
        </div>
    );
};
