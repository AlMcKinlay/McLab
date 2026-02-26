import { createRoot } from "react-dom/client";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { initializeTheme } from "shared-utils";

// Initialize theme before rendering to prevent flickering
initializeTheme();

const root = createRoot(document.getElementById("root"));

root.render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
