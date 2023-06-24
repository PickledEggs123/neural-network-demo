import React, {useEffect, useState} from 'react';
// @ts-ignore
import * as d3 from 'd3';
import './App.css';

enum EPATTERN {
  RANDOM = "RANDOM",
  CHECKER = "CHECKER",
  STRIPE = "STRIPE",
  CIRCLE = "CIRCLE"
}

function App() {
  const [pattern, setPattern] = useState<EPATTERN>(EPATTERN.RANDOM);

  const fillFunction = (point: [number, number], pattern: EPATTERN) => {
    switch (pattern) {
      case EPATTERN.RANDOM: {
        return Math.random() >= 0.5 ? "red" : "blue";
      }
      case EPATTERN.CHECKER: {
        return (Math.floor(point[0] / 200) + Math.floor(point[1] / 200)) % 2 === 0 ? "red" : "blue";
      }
      case EPATTERN.STRIPE: {
        return (Math.floor((point[0] + point[1]) / 200)) % 2 === 0 ? "red" : "blue";
      }
      case EPATTERN.CIRCLE: {
        return Math.sqrt(Math.pow(point[0] - 350, 2) + Math.pow(point[1] - 350, 2)) >= 250 ? "red" : "blue";
      }
    }
  };

  useEffect(() => {
    const data: [number, number][] = new Array(1000).fill(0).map(_ => {
      return [Math.random() * 700, Math.random() * 700];
    });
    let svg: any = d3.select(".App").select("svg");
    if (svg.empty()) {
      svg = d3.select(".App").append("svg").attr("width", 700).attr("height", 700);
    }
    svg.selectAll("circle").remove();
    svg.selectAll("circle").data(data).enter().append("circle")
          .attr("cx", (d: [number, number]) => d[0])
          .attr("cy", (d: [number, number]) => d[1])
          .attr("r", 2)
          .attr("fill", (d: [number, number]) => fillFunction(d, pattern));

    const lineData: [number, number, number, number][] = new Array(100).fill(0).map(_ => {
      // compute half spaces for machine learning
      const a = Math.random() * 2 * Math.PI;
      const ml = {
        px: Math.random(),
        py: Math.random(),
        nx: Math.cos(a),
        ny: Math.sin(a),
        b: 0
      };
      ml.b = (ml.px * ml.nx) + (ml.py * ml.ny);

      // compute linear intersections with edge for graphics
      const a2 = a + Math.PI / 2;
      const t = {
        x: Math.cos(a2),
        y: Math.sin(a2),
      };
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
      graphics.t1 = Math.min(Math.abs(graphics.x1), Math.abs(graphics.y1));
      graphics.t1 *= Math.abs(graphics.x1) === graphics.t1 ? Math.sign(graphics.x1) : Math.sign(graphics.y1);
      graphics.t2 = Math.min(Math.abs(graphics.x2), Math.abs(graphics.y2));
      graphics.t2 *= Math.abs(graphics.x2) === graphics.t2 ? Math.sign(graphics.x2) : Math.sign(graphics.y2);

      graphics.x1 = ml.px - graphics.t1 * t.x;
      graphics.y1 = ml.py - graphics.t1 * t.y;
      graphics.x2 = ml.px + graphics.t2 * t.x;
      graphics.y2 = ml.py + graphics.t2 * t.y;
      graphics.x1 *= 700;
      graphics.y1 *= 700;
      graphics.x2 *= 700;
      graphics.y2 *= 700;

      const mlMath = {
        ml,
        graphics
      };
      return [
        graphics.x1, graphics.y1, graphics.x2, graphics.y2
      ];
    });
    svg.selectAll("line").remove();
    svg.selectAll("line").data(lineData).enter().append("line")
        .attr("x1", (d: [number, number, number, number, number]) => d[0])
        .attr("y1", (d: [number, number, number, number, number]) => d[1])
        .attr("x2", (d: [number, number, number, number, number]) => d[2])
        .attr("y2", (d: [number, number, number, number, number]) => d[3])
        .attr("stroke", "black");

    console.log("DRAW", pattern);
  }, [pattern]);
  return (
    <div className="App">
      <h1>Neural Network Demo</h1>
      <h3>by Tyler T</h3>
      <div>
        <label>
          <input type="radio" checked={pattern === EPATTERN.RANDOM} value={EPATTERN.RANDOM} onChange={() => setPattern(EPATTERN.RANDOM)}></input>
          <span>Random</span></label>
        <label>
          <input type="radio" checked={pattern === EPATTERN.CHECKER} value={EPATTERN.CHECKER} onChange={() => setPattern(EPATTERN.CHECKER)}></input>
          <span>Checker</span></label>
        <label>
          <input type="radio" checked={pattern === EPATTERN.STRIPE} value={EPATTERN.STRIPE} onChange={() => setPattern(EPATTERN.STRIPE)}></input>
          <span>Stripe</span></label>
        <label>
          <input type="radio" checked={pattern === EPATTERN.CIRCLE} value={EPATTERN.CIRCLE} onChange={() => setPattern(EPATTERN.CIRCLE)}></input>
          <span>Circle</span></label>
      </div>
    </div>
  );
}

export default App;
