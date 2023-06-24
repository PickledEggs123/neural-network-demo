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
