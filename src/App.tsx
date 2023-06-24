import React, {useEffect, useState} from 'react';
// @ts-ignore
import * as d3 from 'd3';
import './App.css';

enum ERenderMode {
  POINTS = "POINTS",
  LINES = "LINES",
  TRIANGLES = "TRIANGLES",
  BOGO = "BOGO"
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

function App() {
  const [renderMode, setRenderMode] = useState<ERenderMode>(ERenderMode.POINTS);
  const [pattern, setPattern] = useState<EPattern>(EPattern.RANDOM);

  const fillFunction = (point: [number, number], pattern: EPattern) => {
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

  useEffect(() => {
    const data: [number, number][] = new Array(1000).fill(0).map(_ => {
      return [Math.random() * 700, Math.random() * 700];
    });

    // these are hyperplanes, a nth dimension half of something, with a normal facing the positive direction, and point as center.
    const halfSpaces: IHalfSpace[] = new Array(100).fill(0).map(_ => {
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

    // construct triangle from 3 half space, note we must intersect planes to generate geometry, this format is
    // optimized for machine learning
    const triangleSpaces = new Array(100).fill(0).map(_ => {
      const list: IHalfSpace[] = [];
      while (list.length < 3) {
        const item = halfSpaces[Math.floor(halfSpaces.length * Math.random())];
        if (!list.includes(item)) {
          list.push(item);
        }
      }
      return list;
    });

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

        // compute intersection of half space, interesting
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

        // insert point
        points.push(p.x * 700, p.y * 700);
      }

      return points as any;
    });

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
            .attr("fill", (d: [number, number]) => fillFunction(d, pattern));
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
            .attr("fill", (d: number[]) => Math.random() >= 0.5 ? "purple" : "green")
            .attr("opacity", (d: number[]) => Math.random() * 0.1);
      }
    }
  }, [renderMode, pattern]);
  return (
    <div className="App">
      <h1>Neural Network Demo</h1>
      <h3>by Tyler T</h3>
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
        {/*<label>*/}
        {/*  <input type="radio" checked={renderMode === ERenderMode.BOGO} value={ERenderMode.BOGO} onChange={() => setRenderMode(ERenderMode.BOGO)}></input>*/}
        {/*  <span>Bogo</span></label>*/}
      </div>
      <div style={{display: renderMode === ERenderMode.POINTS ? "block" : "none"}}>
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
    </div>
  );
}

export default App;
