import React from "react";
import {Link} from "react-router-dom";

export const RootLayout = ({children}: React.PropsWithChildren) => {
    return (
        <div className="App">
            <h1>Tyler Truong Neural Network Demo</h1>
            <div>
                <Link to={"/"}><button style={{color: "white", background: window.location.pathname === "/" || window.location.pathname === "/plot" ? "blue" : "black"}}>Plot</button></Link>&nbsp;*&nbsp;
                <Link to={"/language"}><button style={{color: "white", background: window.location.pathname === "/language" ? "blue" : "black"}}>Language</button></Link>
            </div>
            {children}
        </div>
    );
};
