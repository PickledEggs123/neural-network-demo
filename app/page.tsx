import {RootLayout} from "./components/RootLayout";


export default function () {
    return (
        <RootLayout>
            <h3>About</h3>
            <p>This is a demo of some neural network and machine learning widgets.&nbsp;
                <a className="underline" href="https://www.linkedin.com/in/tyler-truong-b48867104/">Tyler Truong</a> created this to show
                neural networks and machine learning in 2d plots and with languages.
            </p>
            <p>The 2d plots was a college question on a test where I bubbled neural network instead of support vector
                machine because I didn't read the book at home. I learned in this demo that my professor was correct
                and a voronoi tesselation based support vector machine works best for 2d plots. It's able to even
                support vectorize random points.
            </p>
            <p>The language page was a college class in advanced statistics based on statistical regression and
            classification. I aced the class by showing the same methods of logistics regression and co-dependencies
            can be used to detect the language or person who wrote a text message. In class I used Trump and Hillary
            to detect "Build the wall" and "African American" to see which candidate was more likely to say those
            phrases. That's a silly machine learning language classifier so in this example, I used the more appropriate
            English, or Spanish, or French, or Vietnamese classifiers. This demo improves on the college example by
            detecting 4 possible outputs instead of just 2 outputs.
            </p>
            <p>The source code for this example can be found on my&nbsp;
                <a className="underline" href="https://github.com/PickledEggs123/neural-network-demo">Github page.</a>
            </p>
        </RootLayout>
    );
};