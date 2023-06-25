import React, {useEffect, useState} from 'react';
// @ts-ignore
import * as d3 from 'd3';
import './App.css';

/**
 * Returns a hash code from a string
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function hashCode(str: string) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

interface IDictData {
    hashDict: number[],
    markovChain: number[][],
    hashChain: number[],
}

// first level neural network which detect 3 letter pairs
const convertTextIntoHashcodes = (text: string): IDictData => {
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    text = text.toLowerCase();
    const size = 256;
    const hashDict = new Array(size).fill(0); // 8kb = 1k * 8b;
    const markovChain: number[][] = new Array(size).fill(0).map(() => new Array(size).fill(0)); // 1k ** 2 * 8b = 1m * 8m = 8mb;
    const hashChain: number[] = [];

    // compute level 1 neural network
    for (let i = 0; i < text.length - 2; i++) {
        const pair = text.substring(i, i + 2);
        const hash = (hashCode(pair)) % hashDict.length;
        hashDict[hash] += 1;
        hashChain.push(hash);
    }

    // compute level 2 neural network
    for (let i = 0; i < hashChain.length - 1; i++) {
        markovChain[hashChain[i]][hashChain[i + 1]] += 1;
    }

    const sum = hashDict.reduce((acc, i) => acc, 1);
    return {
        hashDict: hashDict.map(i => i / sum),
        markovChain: markovChain.map(i => i.map(j => j / sum)),
        hashChain,
    };
};


const buildEnglishDict = async (): Promise<IDictData> => {
    const req = await fetch("/books/the-jungle.txt");
    let text = await req.text();
    const lines = text.split('\n');
    lines.splice(0, 26);
    text = lines.join('\n');
    const req2 = await fetch("/books/divine-comedy-2.txt");
    let text2 = await req2.text();
    const lines2 = text.split('\n');
    lines2.splice(0, 26);
    text2 = lines2.join('\n');
    return convertTextIntoHashcodes(text + text2);
};
const buildSpanishDict = async (): Promise<IDictData> => {
    const req = await fetch("/books/don-quijote.txt");
    let text = await req.text();
    const lines = text.split('\n');
    lines.splice(0, 26);
    text = lines.join('\n');
    const req2 = await fetch("/books/divine-comedy.txt");
    let text2 = await req2.text();
    const lines2 = text.split('\n');
    lines2.splice(0, 26);
    text2 = lines2.join('\n');
    return convertTextIntoHashcodes(text + text2);
};

const buildTwoClassDetector = async (): Promise<IDictData> => {
    const english = await buildEnglishDict();
    const spanish = await buildSpanishDict();

    // level 1 neural network
    const englishLogisticRegression = new Array(english.hashDict.length).fill(0);
    for (let i = 0; i < englishLogisticRegression.length; i++) {
        const englishCount = english.hashDict[i];
        const spanishCount = spanish.hashDict[i];
        if (englishCount > spanishCount * 2) {
            englishLogisticRegression[i] = Math.log10(englishCount - spanishCount);
        }
        if (spanishCount > englishCount * 2) {
            englishLogisticRegression[i] = -(Math.log10(spanishCount - englishCount));
        }
    }
    const logPositive = englishLogisticRegression.reduce((a, i) => a + (i > 0 ? i : 0), 0);
    const logNegative = -englishLogisticRegression.reduce((a, i) => a + (i < 0 ? i : 0), 0);
    for (let i = 0; i < englishLogisticRegression.length; i++) {
        englishLogisticRegression[i] = englishLogisticRegression[i] > 0 ? englishLogisticRegression[i] / logPositive : englishLogisticRegression[i] / logNegative;
    }

    // level 2 neural network
    const englishMarkovRegression: number[][] = new Array(english.markovChain.length).fill(0).map(() => new Array(english.markovChain.length).fill(0));
    for (let i = 0; i < englishMarkovRegression.length; i++) {
        for (let j = 0; j < englishMarkovRegression[i].length; j++) {
            const englishCount = english.markovChain[i][j];
            const spanishCount = spanish.markovChain[i][j];
            if (englishCount > spanishCount * 2) {
                englishMarkovRegression[i][j] = Math.log10(englishCount - spanishCount);
            }
            if (spanishCount > englishCount * 2) {
                englishMarkovRegression[i][j] = -(Math.log10(spanishCount - englishCount));
            }
        }
    }
    const markovPositive = englishMarkovRegression.reduce((a, i) => i.reduce((b, j) => b + (j > 0 ? j : 0), 0), 0);
    const markovNegative = -englishMarkovRegression.reduce((a, i) => i.reduce((b, j) => b + (j < 0 ? j : 0), 0), 0);
    for (let i = 0; i < englishMarkovRegression.length; i++) {
        for (let j = 0; j < englishMarkovRegression[i].length; j++) {
            englishMarkovRegression[i][j] = englishMarkovRegression[i][j] > 0 ? englishMarkovRegression[i][j] / markovPositive : englishMarkovRegression[i][j] / markovNegative;
        }
    }

    return {
        hashDict: englishLogisticRegression,
        markovChain: englishMarkovRegression,
        hashChain: [],
    };
};

function LanguagePage() {
  const [textValue, setTextValue] = useState("");
  const [languageDetected, setLanguageDetected] = useState("");

  const [context] = useState<{twoClassDetector: Promise<IDictData> | null }>({
      twoClassDetector: null
  });
  useEffect(() => {
      context.twoClassDetector = buildTwoClassDetector();

      return () => {
      };
  }, [])

  const detectLanguage = async (text: string) => {
    setLanguageDetected("");
    const hashDict = convertTextIntoHashcodes(text);

    const classifier = await context.twoClassDetector!;
    let sum1 = 0;
    for (let i = 0; i < classifier.hashDict.length; i++) {
        sum1 += classifier.hashDict[i] * hashDict.hashDict[i];
    }
    let sum2 = 0;
    for (let i = 0; i < hashDict.hashChain.length - 2; i++) {
        const x = hashDict.hashChain[i];
        const y = hashDict.hashChain[i + 1];
        sum2 += classifier.markovChain[x][y];
    }
    const sum = sum1 + sum2;
    if (sum >= 0) {
        setLanguageDetected(`English; regression ${sum1.toPrecision(3)}; markov ${sum2.toPrecision(3)}; total ${sum.toPrecision(3)}`);
    } else {
        setLanguageDetected(`Spanish; regression ${sum1.toPrecision(3)}; markov ${sum2.toPrecision(3)}; total ${sum.toPrecision(3)}`);
    }
  };

  return (
    <div className="App">
      <h1>Neural Network Demo</h1>
      <h3>by Tyler T</h3>
        <div>
            <textarea rows={5} cols={80} value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Please type here, Por favor escriba aquí"></textarea>
        </div>
        <div>
            <button onClick={() => detectLanguage(textValue)}>Detect Language</button>
        </div>
        <div>
            Found the language: {languageDetected}
        </div>
    </div>
  );
}

export default LanguagePage;
