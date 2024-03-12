"use client";

import React, {useEffect, useState} from 'react';
import {RootLayout} from "../components/RootLayout";

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

    const sum = hashDict.reduce((acc) => acc + 1, 1);
    return {
        hashDict: hashDict.map(i => i / sum),
        markovChain: markovChain.map(i => i.map(j => j / sum)),
        hashChain,
    };
};

const combineHashcodes = (a: IDictData, b: IDictData): IDictData => {
    const sum = a.hashDict.reduce((acc) => acc + 1, 1) + b.hashDict.reduce((acc) => acc + 1, 1);
    return {
        hashDict: a.hashDict.map((v, i) => (v + b.hashDict[i]) / sum),
        markovChain: a.markovChain.map((v1, i) => v1.map((v2, j) => (v2 + b.markovChain[i][j]) / sum)),
        hashChain: a.hashChain.map((v, i) => v + b.hashChain[i]),
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
const buildFrenchDict = async (): Promise<IDictData> => {
    const req = await fetch("/books/le-infernale.txt");
    let text = await req.text();
    const lines = text.split('\n');
    lines.splice(0, 26);
    text = lines.join('\n');
    return convertTextIntoHashcodes(text);
};
const buildVietnameseDict = async (): Promise<IDictData> => {
    const req = await fetch("/books/East-Side-Union-High-School Distric-vietnamese-book.txt");
    let text = await req.text();
    const lines = text.split('\n');
    lines.splice(0, 26);
    text = lines.join('\n');
    return convertTextIntoHashcodes(text);
};

const buildTwoClassDetector = async (): Promise<{[key: string]: IDictData}> => {
    const english = await buildEnglishDict();
    const spanish = await buildSpanishDict();
    const french = await buildFrenchDict();
    const vietnamese = await buildVietnameseDict();

    const buildMainDetector = (main: IDictData, other: IDictData): IDictData => {
        // level 1 neural network
        const englishLogisticRegression = new Array(main.hashDict.length).fill(0);
        for (let i = 0; i < englishLogisticRegression.length; i++) {
            const englishCount = main.hashDict[i];
            const spanishCount = other.hashDict[i];
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
        const englishMarkovRegression: number[][] = new Array(main.markovChain.length).fill(0).map(() => new Array(main.markovChain.length).fill(0));
        for (let i = 0; i < englishMarkovRegression.length; i++) {
            for (let j = 0; j < englishMarkovRegression[i].length; j++) {
                const englishCount = main.markovChain[i][j];
                const spanishCount = other.markovChain[i][j];
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

    return {
        english: buildMainDetector(english, combineHashcodes(spanish, combineHashcodes(french, vietnamese))),
        spanish: buildMainDetector(spanish, combineHashcodes(english, combineHashcodes(french, vietnamese))),
        french: buildMainDetector(french, combineHashcodes(spanish, combineHashcodes(english, vietnamese))),
        vietnamese: buildMainDetector(vietnamese, combineHashcodes(spanish, combineHashcodes(french, english))),
    };
};

function Page() {
    const [textValue, setTextValue] = useState("");
    const [languageDetected, setLanguageDetected] = useState("");

    const [context] = useState<{twoClassDetector: Promise<{[key: string]: IDictData}> | null }>({
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
        const detectLanguage = (key: string): number => {
            let sum1 = 0;
            for (let i = 0; i < classifier[key].hashDict.length; i++) {
                sum1 += classifier[key].hashDict[i] * hashDict.hashDict[i];
            }
            let sum2 = 0;
            for (let i = 0; i < hashDict.hashChain.length - 2; i++) {
                const x = hashDict.hashChain[i];
                const y = hashDict.hashChain[i + 1];
                sum2 += classifier[key].markovChain[x][y];
            }
            const sum = sum1 + sum2;
            return sum;
        };

        const englishSum = detectLanguage("english");
        const spanishSum = detectLanguage("spanish");
        const frenchSum = detectLanguage("french");
        const vietnameseSum = detectLanguage("vietnamese");
        const sumArray = [englishSum, spanishSum, frenchSum, vietnameseSum];
        const maxValue = sumArray.reduce((acc, v) => Math.max(acc, v), Number.NEGATIVE_INFINITY);
        const maxIndex = sumArray.indexOf(maxValue);
        if (maxIndex === 0) {
            setLanguageDetected(`English; regression ${englishSum.toPrecision(3)}; markov ${englishSum.toPrecision(3)}; total ${englishSum.toPrecision(3)}`);
        } else if (maxIndex === 1) {
            setLanguageDetected(`Spanish; regression ${spanishSum.toPrecision(3)}; markov ${spanishSum.toPrecision(3)}; total ${spanishSum.toPrecision(3)}`);
        } else if (maxIndex === 2) {
            setLanguageDetected(`French; regression ${frenchSum.toPrecision(3)}; markov ${frenchSum.toPrecision(3)}; total ${frenchSum.toPrecision(3)}`);
        } else if (maxIndex === 3) {
            setLanguageDetected(`Vietnamese; regression ${vietnameseSum.toPrecision(3)}; markov ${vietnameseSum.toPrecision(3)}; total ${vietnameseSum.toPrecision(3)}`);
        }
    };

    return (
        <>
            <h3>Language Detection</h3>
            <p>This page can detect English, Spanish, French, or Vietnamese phrases. Please try &ldquo;five elephants walking&rdquo; or &ldquo;cinco elefantes caminando&rdquo; or &ldquo;manger un croissant&rdquo; or &ldquo;nam con voi dang di dao&rdquo;.</p>
            <div>
                <textarea rows={5} cols={80} value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Please type here, Por favor escriba aquí"></textarea>
            </div>
            <div>
                <button onClick={() => detectLanguage(textValue)}>Detect Language</button>
            </div>
            <div>
                Found the language: {languageDetected}
            </div>
        </>
    );
}

export default Page;
