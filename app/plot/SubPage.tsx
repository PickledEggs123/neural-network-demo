"use client";

import React, {useEffect, useState} from 'react';
// @ts-ignore
import * as d3 from 'd3';
import {Site, Vertex, Voronoi} from "voronoijs";
import {RootLayout} from "../components/RootLayout";

enum ERenderMode {
    POINTS = "POINTS",
    LINES = "LINES",
    TRIANGLES = "TRIANGLES",
    BOGO = "BOGO",
    VORONOI = "VORONOI",
}

enum EPattern {
    RANDOM = "RANDOM",
    CHECKER = "CHECKER",
    STRIPE = "STRIPE",
    CIRCLE = "CIRCLE"
}

interface IHalfSpace {
    px: number;
    py: number;
    nx: number;
    ny: number;
    b: number;
    a: number;
}

function GetIntersectionOfTwoHalfSpaces(a: IHalfSpace, b: IHalfSpace) {// compute intersection of half space, interesting
    const a1 = {
        px: a.px,
        py: a.py,
        vx: Math.cos(a.a + Math.PI / 2),
        vy: Math.sin(a.a + Math.PI / 2),
    };
    const b2 = {
        px: b.px,
        py: b.py,
        vx: Math.cos(b.a + Math.PI / 2),
        vy: Math.sin(b.a + Math.PI / 2),
        nx: b.nx,
        ny: b.ny
    };
    const d = {
        x: a.px - b.px,
        y: a.py - b.py
    };
    const r = {
        x: a1.vx + b2.vx,
        y: a1.vy + b2.vy,
    };

    ///////////////////////////////////////////////////////
    //
    //      A ----  Av
    //      /\     \
    //        \  |   ----
    //         \D| Bn     \
    //          \|         ----\
    //           B----------------> Bv
    //
    ///////////////////////////////////////////////////////

    // distance formula d = st
    const proj1 = (d.x * b2.nx + d.y * b2.ny);
    const proj2 = (r.x * b2.nx + r.y * b2.ny);
    let t = proj1 / proj2;
    const p = {
        x: a1.px - t * a1.vx,
        y: a1.py - t * a1.vy,
    };

    const verifyA = a.px * a.nx + a.py * a.ny - a.b;
    const verifyB = b.px * b.nx + b.py * b.ny - b.b;
    const verify1 = p.x * a.nx + p.y * a.ny - a.b;
    const verify2 = p.x * b.nx + p.y * b.ny - b.b;

    if (Math.abs(verifyA) > 0.01 || Math.abs(verifyB) > 0.01) {
        throw new Error("Hyperplane invalid");
    }
    if (Math.abs(verify1) > 0.01 || Math.abs(verify2) > 0.01) {
        throw new Error("Hyperplane rejected intersection, not true intersection");
    }

    return p;
}

function GenerateBogoData(halfSpaces: IHalfSpace[], data: [number, number, string][], oldBogoData: Array<IHalfSpace[]>) {
    // construct triangle from 3 half space, note we must intersect planes to generate geometry, this format is
    // optimized for machine learning
    const triangleSpaces = [];
    triangleSpaces.push(...oldBogoData);
    triangleSpaces.push(...new Array(1000 - oldBogoData.length).fill(0).map(_ => {
        const list: IHalfSpace[] = [];
        for (let step = 0; step < 10 * 1000 && list.length < 3; step++) {
            if (list.length <= 0) {
                const item = halfSpaces[Math.floor(halfSpaces.length * Math.random())];
                list.push(item);
            }
            else {
                const item = halfSpaces[Math.floor(halfSpaces.length * Math.random())];
                if (!list.includes(item)) {
                    if (list[1]) {
                        const p = GetIntersectionOfTwoHalfSpaces(list[0], list[1]);
                        const offset = p.x * item.nx + p.y * item.ny - item.b;
                        if (offset > 0 && offset < 0.05)
                        {
                            list.push(item);
                        } else {
                            list.push(item);
                        }
                    }
                    else if (list[0]) {
                        const dot = item.nx * list[0].nx + item.ny * list[0].ny;
                        if (Math.abs(dot) > 0.45 && Math.abs(dot) < 0.55)
                        {
                            list.push(item);
                        }
                    }
                }
            }
        }
        return list;
    }));

    // construct geometry for the half spaces by drawing lines between the edges of the screen
    const lineData: [number, number, number, number][] = halfSpaces.map(ml => {
        // compute linear intersections with edge for graphics

        // compute perpendicular line direction
        const a2 = ml.a + Math.PI / 2;
        const t = {
            x: Math.cos(a2),
            y: Math.sin(a2),
        }

        // fill out points and use speed distance time equation to solve for line segment render
        // st = d
        // t = d / s
        const graphics = {
            x1: ml.px / t.x,
            y1: ml.py / t.y,
            x2: (1 - ml.px) / t.x,
            y2: (1 - ml.py) / t.y,
            t1: 0,
            t2: 0,
        };

        // find time
        graphics.t1 = Math.min(Math.abs(graphics.x1), Math.abs(graphics.y1));
        graphics.t1 *= Math.abs(graphics.x1) === graphics.t1 ? Math.sign(graphics.x1) : Math.sign(graphics.y1);
        graphics.t2 = Math.min(Math.abs(graphics.x2), Math.abs(graphics.y2));
        graphics.t2 *= Math.abs(graphics.x2) === graphics.t2 ? Math.sign(graphics.x2) : Math.sign(graphics.y2);

        // draw lines to edge
        graphics.x1 = ml.px - graphics.t1 * t.x;
        graphics.y1 = ml.py - graphics.t1 * t.y;
        graphics.x2 = ml.px + graphics.t2 * t.x;
        graphics.y2 = ml.py + graphics.t2 * t.y;

        // fill screen
        graphics.x1 *= 700;
        graphics.y1 *= 700;
        graphics.x2 *= 700;
        graphics.y2 *= 700;

        return [
            graphics.x1, graphics.y1, graphics.x2, graphics.y2
        ];
    });

    // compute intersection between lines to form a triangle, which is the second level of a neural network
    const triangleData: number[] = triangleSpaces.map(mls => {
        // compute points for corners of a triangle
        const points: number[] = [];

        for (let i = 0; i < mls.length; i++) {
            // select a pair of half spaces
            const a = mls[i % mls.length];
            const b = mls[(i + 1) % mls.length];

            const p = GetIntersectionOfTwoHalfSpaces(a, b);

            // insert point
            points.push(p.x * 700, p.y * 700);
        }

        return points as any;
    }).filter(x => x.length > 0);

    // compute the bogo intersection data of points and triangles
    const triangleBogo: Array<{ color: string, data: number[] }> = triangleSpaces.reduce((acc: [{ red: number, blue: number, data: number[] }], mls, i: number): [{ red: number, blue: number, data: number[] }] => {
        const item = {
            red: 0,
            blue: 0,
            data: triangleData[i],
        };

        for (const dataItem of data) {
            if (mls.every(h => dataItem[0] * h.nx + dataItem[1] * h.ny - h.b >= 0)) {
                if (dataItem[2] === "red") {
                    item.red += 1;
                    item.blue -= 2;
                }
                if (dataItem[2] === "blue") {
                    item.blue += 1;
                    item.red -= 2;
                }
            }
        }

        acc.push(item as any);
        return acc;
    }, [] as any).map(x => {
        if (x.red > 3 && x.blue <= 0) {
            return {
                color: "red",
                data: x.data
            };
        }
        if (x.blue > 3 && x.red <= 0) {
            return {
                color: "blue",
                data: x.data
            };
        }
        return {
            color: "none",
            data: x.data
        };
    });

    return {lineData, triangleData, triangleBogo, triangleSpaces};
}

function Plot2dPage() {
    const [renderMode, setRenderMode] = useState<ERenderMode>(ERenderMode.POINTS);
    const [pattern, setPattern] = useState<EPattern>(EPattern.RANDOM);
    const [numTrianglesMade, setNumTrianglesMade] = useState(0);
    const [timeLeft, setTimeLeft] = useState("");

    const fillFunction = (point: [number, number], pattern: EPattern): string => {
        switch (pattern) {
            case EPattern.RANDOM: {
                return Math.random() >= 0.5 ? "red" : "blue";
            }
            case EPattern.CHECKER: {
                return (Math.floor(point[0] / 200) + Math.floor(point[1] / 200)) % 2 === 0 ? "red" : "blue";
            }
            case EPattern.STRIPE: {
                return (Math.floor((point[0] + point[1]) / 200)) % 2 === 0 ? "red" : "blue";
            }
            case EPattern.CIRCLE: {
                return Math.sqrt(Math.pow(point[0] - 350, 2) + Math.pow(point[1] - 350, 2)) >= 250 ? "red" : "blue";
            }
        }
    };

    const runLongTask = async (renderMode: ERenderMode, pattern: EPattern) => {
        setNumTrianglesMade(0);
        setTimeLeft("");

        const data: [number, number, string][] = new Array(1000).fill(0).map(_ => {
            const p = [Math.random() * 700, Math.random() * 700] as [number, number];
            return [p[0], p[1], fillFunction(p, pattern)] as [number, number, string];
        });

        // these are hyperplanes, a nth dimension half of something, with a normal facing the positive direction, and point as center.
        const halfSpaces: IHalfSpace[] = new Array(1000).fill(0).map(_ => {
            // compute half spaces for machine learning
            const a = Math.random() * 2 * Math.PI;
            const ml = {
                px: Math.random(),
                py: Math.random(),
                nx: Math.cos(a),
                ny: Math.sin(a),
                b: 0,
                a,
            };
            ml.b = (ml.px * ml.nx) + (ml.py * ml.ny);
            return ml;
        });
        let bogoData: any = [];
        let lineData: any = [];
        let triangleData: any = [];
        let triangleBogo: any = [];
        let triangleSpaces: any = [];
        let endTime = new Date();
        endTime.setSeconds(endTime.getSeconds() + 60);
        if (renderMode === ERenderMode.VORONOI) {
            const voronoi = new Voronoi();
            const sites = data.map((x, i): Site => ({id: i, x: x[0], y: x[1], color: x[2]} as any));
            const diagram = voronoi.compute(sites, { xl: 0, xr: 700, yt: 0, yb: 700});
            for (const cell of diagram.cells) {
                const vertices: Vertex[] = [];
                cell.prepareHalfedges();
                for (const halfEdge of cell.halfedges) {
                    vertices.push(halfEdge.getStartpoint());
                }
                const vData = vertices.reduce((acc, x) => [...acc, x.x, x.y], [] as number[]);
                triangleSpaces.push(vData);
                triangleBogo.push({
                    color: (cell.site as any).color,
                    data: vData,
                });
                bogoData = triangleBogo;
            }
        } else {
            for (; +endTime > +new Date() && bogoData.length < 100;) {
                const item = GenerateBogoData(halfSpaces, data, triangleSpaces);
                lineData = item.lineData;
                triangleData = item.triangleData;
                triangleBogo = item.triangleBogo;
                triangleSpaces = item.triangleSpaces;
                triangleSpaces = triangleSpaces.filter((x: any, i: number) => triangleBogo[i]?.color !== "none")
                bogoData = triangleBogo.filter((x: any) => x.color !== "none");
                setNumTrianglesMade(bogoData.length);
                setTimeLeft(((+endTime - +new Date()) / 1000).toString());
                await new Promise<void>((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 15);
                });
            }
        }

        let svg: any = d3.select(".App").select("svg");
        if (svg.empty()) {
            svg = d3.select(".App").append("svg").attr("width", 700).attr("height", 700);
        }

        svg.selectAll("circle").remove();
        svg.selectAll("line").remove();
        svg.selectAll("polyline").remove();

        // draw circles
        switch (renderMode) {
            case ERenderMode.POINTS: {
                svg.selectAll("circle").data(data).enter().append("circle")
                    .attr("cx", (d: [number, number]) => d[0])
                    .attr("cy", (d: [number, number]) => d[1])
                    .attr("r", 2)
                    .attr("fill", (d: [number, number, string]) => d[2]);
                break;
            }
            case ERenderMode.LINES: {
                svg.selectAll("line").data(lineData).enter().append("line")
                    .attr("x1", (d: [number, number, number, number, number]) => d[0])
                    .attr("y1", (d: [number, number, number, number, number]) => d[1])
                    .attr("x2", (d: [number, number, number, number, number]) => d[2])
                    .attr("y2", (d: [number, number, number, number, number]) => d[3])
                    .attr("stroke", "black");
                break;
            }
            case ERenderMode.TRIANGLES: {
                svg.selectAll("polyline").data(triangleData).enter().append("polyline")
                    .attr("points", (d: number[]) => d.join(" "))
                    .attr("fill", () => Math.random() >= 0.5 ? "purple" : "green")
                    .attr("opacity", () => 0.1);
                break;
            }
            case ERenderMode.BOGO: {
                svg.selectAll("circle").data(data).enter().append("circle")
                    .attr("cx", (d: [number, number]) => d[0])
                    .attr("cy", (d: [number, number]) => d[1])
                    .attr("r", 2)
                    .attr("fill", (d: [number, number, string]) => d[2]);
                svg.selectAll("polyline").data(triangleBogo).enter().append("polyline")
                    .attr("points", (d: any) => d.data.join(" "))
                    .attr("fill", (d: any) => d.color)
                    .attr("opacity", () => 0.1);
                break;
            }
            case ERenderMode.VORONOI: {
                svg.selectAll("circle").data(data).enter().append("circle")
                    .attr("cx", (d: [number, number]) => d[0])
                    .attr("cy", (d: [number, number]) => d[1])
                    .attr("r", 2)
                    .attr("fill", (d: [number, number, string]) => d[2]);
                svg.selectAll("polyline").data(triangleBogo).enter().append("polyline")
                    .attr("points", (d: any) => d.data.join(" "))
                    .attr("fill", (d: any) => d.color)
                    .attr("opacity", () => 0.1);
                break;
            }
        }
    };

    const [context] = useState({isRunning: false});

    const wrapLongTask = async (renderMode: ERenderMode, pattern: EPattern) => {
        try {
            context.isRunning = true;

            await runLongTask(renderMode, pattern);
        }
        finally {
            context.isRunning = false;
        }
    };

    useEffect(() => {
        wrapLongTask(renderMode, pattern);
    }, [renderMode, pattern]);
    return (
        <>
            <h3>Plotting with neural networks</h3>
            <p>This page shows plotting using netural networks which is a complete mess. Neural networks attempt to create triangles from randomly selected line segments and almost always, the triangles are terrible at sorting the dots. Support Vector Machine using Voronoi Tesselation works best for plotting.</p>
            <div>
                <label>
                    <input type="radio" checked={renderMode === ERenderMode.POINTS} value={ERenderMode.POINTS} onChange={() => setRenderMode(ERenderMode.POINTS)}></input>
                    <span>Points</span></label>
                <label>
                    <input type="radio" checked={renderMode === ERenderMode.LINES} value={ERenderMode.LINES} onChange={() => setRenderMode(ERenderMode.LINES)}></input>
                    <span>Lines</span></label>
                <label>
                    <input type="radio" checked={renderMode === ERenderMode.TRIANGLES} value={ERenderMode.TRIANGLES} onChange={() => setRenderMode(ERenderMode.TRIANGLES)}></input>
                    <span>Triangles</span></label>
                <label>
                    <input type="radio" checked={renderMode === ERenderMode.BOGO} value={ERenderMode.BOGO} onChange={() => setRenderMode(ERenderMode.BOGO)}></input>
                    <span>Bogo</span></label>
                <label>
                    <input type="radio" checked={renderMode === ERenderMode.VORONOI} value={ERenderMode.VORONOI} onChange={() => setRenderMode(ERenderMode.VORONOI)}></input>
                    <span>Voronoi</span></label>
            </div>
            <div>
                <label>
                    <input type="radio" checked={pattern === EPattern.RANDOM} value={EPattern.RANDOM} onChange={() => setPattern(EPattern.RANDOM)}></input>
                    <span>Random</span></label>
                <label>
                    <input type="radio" checked={pattern === EPattern.CHECKER} value={EPattern.CHECKER} onChange={() => setPattern(EPattern.CHECKER)}></input>
                    <span>Checker</span></label>
                <label>
                    <input type="radio" checked={pattern === EPattern.STRIPE} value={EPattern.STRIPE} onChange={() => setPattern(EPattern.STRIPE)}></input>
                    <span>Stripe</span></label>
                <label>
                    <input type="radio" checked={pattern === EPattern.CIRCLE} value={EPattern.CIRCLE} onChange={() => setPattern(EPattern.CIRCLE)}></input>
                    <span>Circle</span></label>
            </div>
            <div>Number of Triangles Generated: {numTrianglesMade}</div>
            <div>Time Left: {timeLeft}</div>
            <div className="App text-center"></div>
        </>
    );
}

export default Plot2dPage;
